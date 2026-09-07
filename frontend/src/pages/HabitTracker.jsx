import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import api from '../api'
import { Badge, Button, Card, EmptyState, ProgressIndicator, Skeleton, StatCallout } from '../components/ui'

const emptyForm = { name: '', frequency: 'daily', targetValue: '', startDate: new Date().toISOString().slice(0, 10), isActive: true }

function dateValue(date) {
  return date.toISOString().slice(0, 10)
}

function periodStart(habit, today = new Date()) {
  const start = new Date(`${String(habit.startDate).slice(0, 10)}T00:00:00.000Z`)
  if (habit.frequency === 'daily') return dateValue(today)
  if (habit.frequency === 'monthly') return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-01`
  const elapsed = Math.max(0, Math.floor((today - start) / 86400000))
  start.setUTCDate(start.getUTCDate() + Math.floor(elapsed / 7) * 7)
  return dateValue(start)
}

function periodLabel(frequency) {
  return frequency === 'daily' ? 'day streak' : frequency === 'weekly' ? 'week streak' : 'month streak'
}

function periodLog(habit, entries, today = new Date()) {
  const start = periodStart(habit, today)
  const end = new Date(`${start}T00:00:00.000Z`)
  if (habit.frequency === 'daily') end.setUTCDate(end.getUTCDate() + 1)
  else if (habit.frequency === 'weekly') end.setUTCDate(end.getUTCDate() + 7)
  else end.setUTCMonth(end.getUTCMonth() + 1)
  const endDate = dateValue(end)
  return entries.find((log) => {
    const logDate = String(log.logDate).slice(0, 10)
    return logDate >= start && logDate < endDate
  })
}

function validateHabit(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (form.targetValue && (!/^\d+(\.\d{1,2})?$/.test(form.targetValue) || Number(form.targetValue) <= 0)) errors.targetValue = 'Target must be positive'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) errors.startDate = 'Use a valid date'
  return errors
}

export function HabitTracker() {
  const { quickAddOpen, setQuickAddOpen } = useOutletContext()
  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [historyHabit, setHistoryHabit] = useState(null)
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState('')

  const loadHabits = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/habits')
      const activeHabits = data.data.filter((habit) => habit.isActive)
      const logEntries = await Promise.all(activeHabits.map(async (habit) => {
        const { data: response } = await api.get(`/api/habits/${habit.habitId}/logs`, { params: { page: 1, pageSize: 100 } })
        return [habit.habitId, response.data.items]
      }))
      setHabits(activeHabits)
      setLogs(Object.fromEntries(logEntries))
      setError('')
    } catch (requestError) {
      setError(requestError.userMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(loadHabits) }, [loadHabits])

  const today = new Date()
  const currentLog = (habit) => periodLog(habit, logs[habit.habitId] || [], today)
  const statusFor = (habit) => {
    const log = currentLog(habit)
    if (log?.status === 'completed' || habit.streakCount > 0) return { label: 'On Track', tone: 'success', value: log?.status === 'completed' ? 100 : 0 }
    // UI-only heuristic: daily habits become At Risk after 18:00 UTC; adjust with product feedback.
    if (habit.frequency === 'daily' && today.getUTCHours() >= 18) return { label: 'At Risk', tone: 'warning', value: 0 }
    return { label: log?.status === 'missed' ? 'Missed' : 'On Track', tone: log?.status === 'missed' ? 'danger' : 'success', value: 0 }
  }

  function openCreate() {
    setEditing(null); setForm({ ...emptyForm }); setFormError(''); setFieldErrors({}); setQuickAddOpen(false)
  }

  function openEdit(habit) {
    setEditing(habit)
    setForm({ name: habit.name, frequency: habit.frequency, targetValue: habit.targetValue || '', startDate: String(habit.startDate).slice(0, 10), isActive: habit.isActive })
    setFormError(''); setFieldErrors({})
  }

  async function submitHabit(event) {
    event.preventDefault()
    const errors = validateHabit(form)
    if (Object.keys(errors).length) { setFieldErrors(errors); return }
    const payload = { ...form, targetValue: form.targetValue || null }
    try {
      if (editing) await api.put(`/api/habits/${editing.habitId}`, payload)
      else await api.post('/api/habits', payload)
      setEditing(null); setQuickAddOpen(false); await loadHabits()
    } catch (requestError) {
      setFormError(requestError.userMessage); setFieldErrors(requestError.fieldErrors)
    }
  }

  async function logHabit(habit, status) {
    try {
      await api.post(`/api/habits/${habit.habitId}/log`, { logDate: dateValue(today), status })
      await loadHabits()
    } catch (requestError) { setError(requestError.userMessage) }
  }

  async function deactivateHabit() {
    try {
      await api.delete(`/api/habits/${deleteTarget.habitId}`)
      setDeleteTarget(null); await loadHabits()
    } catch (requestError) { setError(requestError.userMessage); setDeleteTarget(null) }
  }

  async function openHistory(habit) {
    setHistoryHabit(habit); setHistory(null); setHistoryError('')
    try {
      const { data } = await api.get(`/api/habits/${habit.habitId}/logs`, { params: { page: 1, pageSize: 100 } })
      setHistory(data.data)
    } catch (requestError) { setHistoryError(requestError.userMessage) }
  }

  async function deleteLog(log) {
    try {
      await api.delete(`/api/habits/${historyHabit.habitId}/logs/${log.logId}`)
      await openHistory(historyHabit); await loadHabits()
    } catch (requestError) { setHistoryError(requestError.userMessage) }
  }

  const showEditor = Boolean(editing || quickAddOpen)
  const hasNoHabits = !loading && habits.length === 0
  const fieldError = (field) => fieldErrors[field] && <span className="field-error">{fieldErrors[field]}</span>

  return <div className="habit-page">
    {error && <Badge tone="danger">{error}</Badge>}
    {loading ? <div className="card-grid"><Skeleton className="skeleton-card" /><Skeleton className="skeleton-card" /></div> : hasNoHabits ? <EmptyState title="Start your first habit — it takes 10 seconds" action="Add Habit" onAction={openCreate} /> : <div className="card-grid">{habits.map((habit) => { const status = statusFor(habit); return <Card key={habit.habitId}><div className="habit-card"><div className="habit-card-heading"><div><h2>{habit.name}</h2><span className="gf-caption">{habit.frequency}</span></div><Badge tone={status.tone}>{status.label}</Badge></div><div className="habit-card-stat"><StatCallout label={periodLabel(habit.frequency)} value={habit.streakCount} /><ProgressIndicator variant="ring" value={status.value} tone={status.tone === 'success' && status.value ? 'success' : 'primary'} /></div><div className="habit-actions"><Button onClick={() => logHabit(habit, 'completed')}>Mark done</Button><Button variant="secondary" onClick={() => logHabit(habit, 'missed')}>Mark missed</Button></div><div className="habit-links"><button className="text-button" onClick={() => openHistory(habit)}>View history</button><button className="icon-button" onClick={() => openEdit(habit)} aria-label={`Edit ${habit.name}`}><Pencil size={20} /></button><button className="icon-button danger-icon" onClick={() => setDeleteTarget(habit)} aria-label={`Deactivate ${habit.name}`}><Trash2 size={20} /></button></div></div></Card> })}</div>}
    {showEditor && <div className="modal-backdrop"><Card className="expense-modal"><div className="modal-heading"><h2>{editing ? 'Edit habit' : 'Add habit'}</h2><button className="icon-button" onClick={() => { setEditing(null); setQuickAddOpen(false) }} aria-label="Close"><X size={20} /></button></div>{formError && <Badge tone="danger">{formError}</Badge>}<form className="expense-form" onSubmit={submitHabit}><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />{fieldError('name')}</label><label>Frequency<select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label>Target value<input inputMode="decimal" value={form.targetValue} onChange={(event) => setForm({ ...form, targetValue: event.target.value })} />{fieldError('targetValue')}</label><label>Start date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />{fieldError('startDate')}</label><Button type="submit">{editing ? 'Save habit' : 'Add habit'}</Button></form></Card></div>}
    {deleteTarget && <div className="modal-backdrop"><Card className="confirmation-modal"><h2>Deactivate this habit?</h2><p>Your history will be preserved.</p><div className="modal-actions"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" onClick={deactivateHabit}>Deactivate habit</Button></div></Card></div>}
    {historyHabit && <div className="modal-backdrop"><Card className="expense-modal"><div className="modal-heading"><h2>{historyHabit.name} history</h2><button className="icon-button" onClick={() => setHistoryHabit(null)} aria-label="Close"><X size={20} /></button></div>{historyError && <Badge tone="danger">{historyError}</Badge>}{history ? <div className="history-list">{history.items.map((log) => <div className="history-row" key={log.logId}><span>{String(log.logDate).slice(0, 10)}</span><Badge tone={log.status === 'completed' ? 'success' : 'danger'}>{log.status}</Badge><button className="icon-button danger-icon" onClick={() => deleteLog(log)} aria-label="Delete log"><Trash2 size={18} /></button></div>)}</div> : <Skeleton className="skeleton-row" />}</Card></div>}
  </div>
}
