import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import api from '../api'
import { Badge, Button, Card, EmptyState, Modal, ProgressIndicator, Skeleton, StatCallout } from '../components/ui'

const emptyForm = {
  goalName: '',
  targetAmount: '',
  currentAmount: '0',
  targetDate: '',
  status: 'active',
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTargetDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`))
}

function validateGoal(form) {
  const errors = {}
  if (!form.goalName.trim()) errors.goalName = 'Goal name is required'
  if (!/^\d+(\.\d{1,2})?$/.test(form.targetAmount) || Number(form.targetAmount) <= 0) errors.targetAmount = 'Target amount must be positive'
  if (!/^\d+(\.\d{1,2})?$/.test(form.currentAmount) || Number(form.currentAmount) < 0) errors.currentAmount = 'Saved amount cannot be negative'
  if (form.targetDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.targetDate)) errors.targetDate = 'Use a valid date'
    else if (form.targetDate <= new Date().toISOString().slice(0, 10)) errors.targetDate = 'Target date must be in the future'
  }
  return errors
}

function statusTone(status) {
  return status === 'completed' ? 'success' : status === 'abandoned' ? 'danger' : 'neutral'
}

export function SavingsGoals() {
  const { quickAddOpen, setQuickAddOpen } = useOutletContext()
  const [goals, setGoals] = useState([])
  const [statusFilter, setStatusFilter] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [contributionGoal, setContributionGoal] = useState(null)
  const [contribution, setContribution] = useState('')
  const [celebrating, setCelebrating] = useState(null)

  const loadGoals = useCallback(async () => {
    setLoading(true)
    try {
      const params = statusFilter === 'all' ? {} : { status: statusFilter }
      const { data } = await api.get('/api/goals', { params })
      setGoals(data.data)
      setError('')
    } catch (requestError) {
      setError(requestError.userMessage)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { void Promise.resolve().then(loadGoals) }, [loadGoals])
  useEffect(() => {
    if (!celebrating) return undefined
    const timeout = window.setTimeout(() => setCelebrating(null), 2500)
    return () => window.clearTimeout(timeout)
  }, [celebrating])

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm })
    setFormError('')
    setFieldErrors({})
    setQuickAddOpen(true)
  }

  function openEdit(goal) {
    setEditing(goal)
    setForm({
      goalName: goal.goalName,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      targetDate: goal.targetDate ? String(goal.targetDate).slice(0, 10) : '',
      status: goal.status,
    })
    setFormError('')
    setFieldErrors({})
  }

  async function submitGoal(event) {
    event.preventDefault()
    const errors = validateGoal(form)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }
    const payload = {
      ...form,
      targetDate: form.targetDate || null,
    }
    try {
      const response = editing
        ? await api.put(`/api/goals/${editing.goalId}`, payload)
        : await api.post('/api/goals', payload)
      if (editing && response.data.data.status === 'completed' && editing.status !== 'completed') setCelebrating(editing.goalId)
      setEditing(null)
      setQuickAddOpen(false)
      await loadGoals()
    } catch (requestError) {
      setFormError(requestError.userMessage)
      setFieldErrors(requestError.fieldErrors || {})
    }
  }

  async function addFunds(goal) {
    if (!/^\d+(\.\d{1,2})?$/.test(contribution) || Number(contribution) <= 0) {
      setError('Enter a positive contribution amount')
      return
    }
    try {
      const response = await api.put(`/api/goals/${goal.goalId}`, {
        goalName: goal.goalName,
        targetAmount: String(goal.targetAmount),
        currentAmount: (Number(goal.currentAmount) + Number(contribution)).toFixed(2),
        targetDate: goal.targetDate ? String(goal.targetDate).slice(0, 10) : null,
        status: goal.status,
      })
      if (response.data.data.status === 'completed' && goal.status !== 'completed') setCelebrating(goal.goalId)
      setContributionGoal(null)
      setContribution('')
      await loadGoals()
    } catch (requestError) {
      setError(requestError.userMessage)
    }
  }

  async function deleteGoal() {
    try {
      await api.delete(`/api/goals/${deleteTarget.goalId}`)
      setDeleteTarget(null)
      await loadGoals()
    } catch (requestError) {
      setError(requestError.userMessage)
      setDeleteTarget(null)
    }
  }

  const showEditor = Boolean(editing || quickAddOpen)
  const fieldError = (field) => fieldErrors[field] && <span className="field-error">{fieldErrors[field]}</span>

  return <div className="goals-page">
    {error && <Badge tone="danger">{error}</Badge>}
    <div className="goals-toolbar">
      <div className="goal-filters" role="tablist" aria-label="Goal status">
        {['active', 'completed', 'abandoned', 'all'].map((status) => <Button key={status} variant={statusFilter === status ? 'primary' : 'secondary'} onClick={() => setStatusFilter(status)}>{status[0].toUpperCase() + status.slice(1)}</Button>)}
      </div>
    </div>
    {loading ? <div className="card-grid"><Skeleton className="skeleton-card" /><Skeleton className="skeleton-card" /></div> : goals.length === 0 ? <EmptyState title="Set your first savings goal — takes 30 seconds" action="Add Goal" onAction={openCreate} /> : <div className="card-grid">{goals.map((goal) => {
      const percent = Number(goal.percentComplete || 0)
      const isCelebrating = celebrating === goal.goalId
      return <Card key={goal.goalId} className={isCelebrating ? 'goal-card goal-card-celebration' : 'goal-card'}>
        <div className="goal-card-heading"><h2>{goal.goalName}</h2><Badge tone={statusTone(goal.status)}>{goal.status[0].toUpperCase() + goal.status.slice(1)}</Badge></div>
        <div className="goal-stat-row"><StatCallout label="Complete" value={`${percent}%`} /><span className="gf-caption">{formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}</span></div>
        <ProgressIndicator value={percent} tone={percent >= 100 ? 'success' : 'primary'} label={`${percent}% complete`} />
        {goal.targetDate && <span className="gf-caption">Target: {formatTargetDate(goal.targetDate)}</span>}
        {isCelebrating && <div className="goal-celebration">Goal reached — keep growing.</div>}
        {goal.status === 'active' && <div className="goal-contribution">{contributionGoal === goal.goalId ? <><input aria-label="Contribution amount" inputMode="decimal" value={contribution} onChange={(event) => setContribution(event.target.value)} placeholder="Amount" /><Button variant="secondary" onClick={() => addFunds(goal)}>Add</Button><Button variant="text" onClick={() => setContributionGoal(null)}>Cancel</Button></> : <Button variant="secondary" onClick={() => setContributionGoal(goal.goalId)}><Plus size={16} /> Add funds</Button>}</div>}
        <div className="goal-actions"><button className="icon-button" onClick={() => openEdit(goal)} aria-label={`Edit ${goal.goalName}`}><Pencil size={20} /></button><button className="icon-button danger-icon" onClick={() => setDeleteTarget(goal)} aria-label={`Delete ${goal.goalName}`}><Trash2 size={20} /></button></div>
      </Card>
    })}</div>}
    {showEditor && <Modal className="expense-modal" onClose={() => { setEditing(null); setQuickAddOpen(false) }}><div className="modal-heading"><h2>{editing ? 'Edit goal' : 'Add goal'}</h2><button className="icon-button" onClick={() => { setEditing(null); setQuickAddOpen(false) }} aria-label="Close"><X size={20} /></button></div>{formError && <Badge tone="danger">{formError}</Badge>}<form className="expense-form" onSubmit={submitGoal}><label>Goal name<input value={form.goalName} onChange={(event) => setForm({ ...form, goalName: event.target.value })} />{fieldError('goalName')}</label><label>Target amount<input inputMode="decimal" value={form.targetAmount} onChange={(event) => setForm({ ...form, targetAmount: event.target.value })} />{fieldError('targetAmount')}</label><label>{editing ? 'Update saved amount to:' : 'Saved amount (optional)'}<input inputMode="decimal" value={form.currentAmount} onChange={(event) => setForm({ ...form, currentAmount: event.target.value })} />{fieldError('currentAmount')}</label><label>Target date (optional)<input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />{fieldError('targetDate')}</label><Button type="submit">{editing ? 'Save goal' : 'Add goal'}</Button></form></Modal>}
    {deleteTarget && <Modal className="confirmation-modal" onClose={() => setDeleteTarget(null)}><h2>Delete this goal?</h2><p>This action cannot be undone.</p><div className="modal-actions"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" onClick={deleteGoal}>Delete goal</Button></div></Modal>}
  </div>
}
