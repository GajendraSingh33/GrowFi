import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/useAuth'
import { Badge, Button, Card, EmptyState, Skeleton, StatCallout, Table } from '../components/ui'

const tabs = ['users', 'feedback', 'analytics']
const feedbackStatuses = ['open', 'in_progress', 'resolved']

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

function statusTone(status) {
  return status === 'resolved' ? 'success' : status === 'in_progress' ? 'warning' : 'neutral'
}

function PageControls({ page, pageSize, total, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return <div className="pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button><span className="gf-caption">Page {page} of {totalPages}</span><Button variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button></div>
}

export function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')
  const [error, setError] = useState('')
  const [users, setUsers] = useState({ items: [], page: 1, pageSize: 25, total: 0 })
  const [userSearch, setUserSearch] = useState('')
  const [userDetail, setUserDetail] = useState(null)
  const [feedback, setFeedback] = useState({ items: [], page: 1, pageSize: 25, total: 0 })
  const [feedbackStatus, setFeedbackStatus] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reopenTarget, setReopenTarget] = useState(null)

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/dashboard', { replace: true })
  }, [navigate, user])

  const loadUsers = useCallback(async () => {
    const { data } = await api.get('/api/admin/users', { params: { page: users.page, pageSize: users.pageSize, search: userSearch || undefined } })
    setUsers(data.data)
  }, [userSearch, users.page, users.pageSize])

  const loadFeedback = useCallback(async () => {
    const { data } = await api.get('/api/admin/feedback', { params: { page: feedback.page, pageSize: feedback.pageSize, status: feedbackStatus || undefined } })
    setFeedback(data.data)
  }, [feedback.page, feedback.pageSize, feedbackStatus])

  const loadAnalytics = useCallback(async () => {
    const { data } = await api.get('/api/admin/analytics')
    setAnalytics(data.data)
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') return undefined
    const request = Promise.resolve().then(() => {
      setLoading(true)
      return tab === 'users' ? loadUsers() : tab === 'feedback' ? loadFeedback() : loadAnalytics()
    })
    request.catch((requestError) => {
      if (requestError.response?.status === 403) {
        navigate('/dashboard', { replace: true })
        return
      }
      setError(requestError.userMessage)
    }).finally(() => setLoading(false))
  }, [loadAnalytics, loadFeedback, loadUsers, navigate, tab, user])

  async function updateUser(target, role, deletedAt) {
    try {
      const { data } = await api.patch(`/api/admin/users/${target.userId}`, { role, deletedAt })
      setUsers((current) => ({ ...current, items: current.items.map((item) => item.userId === target.userId ? data.data.user : item) }))
      setError('')
    } catch (requestError) {
      setError(requestError.userMessage)
    }
  }

  async function showUserDetail(target) {
    try {
      const { data } = await api.get(`/api/admin/users/${target.userId}`)
      setUserDetail(data.data.user)
    } catch (requestError) {
      setError(requestError.userMessage)
    }
  }

  async function updateFeedback(item, status, force = false) {
    if (item.status === 'resolved' && status === 'open' && !force) {
      setReopenTarget(item)
      return
    }
    try {
      await api.patch(`/api/admin/feedback/${item.feedbackId}`, { status, ...(force ? { force: true } : {}) })
      setReopenTarget(null)
      await loadFeedback()
      setError('')
    } catch (requestError) {
      setError(requestError.userMessage)
      setReopenTarget(null)
    }
  }

  if (user?.role !== 'admin') return null

  return <div className="admin-page">
    {error && <Badge tone="danger">{error}</Badge>}
    <div className="admin-tabs" role="tablist" aria-label="Admin sections">{tabs.map((item) => <Button key={item} variant={tab === item ? 'primary' : 'secondary'} onClick={() => setTab(item)}>{item[0].toUpperCase() + item.slice(1)}</Button>)}</div>
    {tab === 'users' && <Card className="admin-panel-card"><div className="admin-toolbar"><label>Search users<input value={userSearch} placeholder="Name or email" onChange={(event) => { setUsers((current) => ({ ...current, page: 1 })); setUserSearch(event.target.value) }} /></label></div>{loading ? <div className="admin-skeletons"><Skeleton className="skeleton-row" /><Skeleton className="skeleton-row" /><Skeleton className="skeleton-row" /></div> : users.items.length ? <Table headers={['Name', 'Email', 'Role', 'Status', 'Created', 'Actions']}><>{users.items.map((item) => <tr key={item.userId} onClick={() => showUserDetail(item)}><td>{item.name}</td><td>{item.email}</td><td><Badge tone={item.role === 'admin' ? 'neutral' : 'success'}>{item.role}</Badge></td><td><Badge tone={item.deletedAt ? 'danger' : 'success'}>{item.deletedAt ? 'Suspended' : 'Active'}</Badge></td><td>{formatDate(item.createdAt)}</td><td onClick={(event) => event.stopPropagation()}><div className="admin-row-controls"><select value={item.role} onChange={(event) => updateUser(item, event.target.value, item.deletedAt)} aria-label={`Role for ${item.email}`}><option value="user">User</option><option value="admin">Admin</option></select><select value={item.deletedAt ? 'suspended' : 'active'} onChange={(event) => updateUser(item, item.role, event.target.value === 'suspended' ? new Date().toISOString() : null)} aria-label={`Status for ${item.email}`}><option value="active">Active</option><option value="suspended">Suspended</option></select></div></td></tr>)}</></Table> : <EmptyState title="No users found" />}<PageControls {...users} onPage={(page) => setUsers((current) => ({ ...current, page }))} /></Card>}
    {tab === 'feedback' && <Card className="admin-panel-card"><div className="admin-toolbar"><label>Status<select value={feedbackStatus} onChange={(event) => { setFeedback((current) => ({ ...current, page: 1 })); setFeedbackStatus(event.target.value) }}><option value="">All</option>{feedbackStatuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label></div>{loading ? <div className="admin-skeletons"><Skeleton className="skeleton-row" /><Skeleton className="skeleton-row" /><Skeleton className="skeleton-row" /></div> : feedback.items.length ? <Table headers={['Subject', 'Message', 'Status', 'Created', 'Actions']}><>{feedback.items.map((item) => <tr key={item.feedbackId}><td>{item.subject}</td><td className="admin-message">{item.message}</td><td><Badge tone={statusTone(item.status)}>{item.status.replace('_', ' ')}</Badge></td><td>{formatDate(item.createdAt)}</td><td><select value={item.status} onChange={(event) => updateFeedback(item, event.target.value)} aria-label={`Status for ${item.subject}`}>{feedbackStatuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></td></tr>)}</></Table> : <EmptyState title="No feedback found" />}<PageControls {...feedback} onPage={(page) => setFeedback((current) => ({ ...current, page }))} /></Card>}
    {tab === 'analytics' && <div className="admin-analytics">{loading ? <><Skeleton className="skeleton-stat" /><Skeleton className="skeleton-stat" /><Skeleton className="skeleton-stat" /><Skeleton className="skeleton-stat" /></> : <><Card><StatCallout label="Active users" value={analytics?.activeUsers ?? 0} /><span className="gf-caption">Active in the last 7 days — login or activity</span></Card><Card><StatCallout label="Habit completion rate" value={`${((analytics?.habitCompletionRate ?? 0) * 100).toFixed(1)}%`} /><span className="gf-caption">Completed eligible logs divided by expected frequency-period occurrences.</span></Card><Card><StatCallout label="Average goal completion" value={`${((analytics?.averageGoalCompletionRate ?? 0) * 100).toFixed(1)}%`} /><span className="gf-caption">Average current amount divided by target amount, capped at 100%.</span></Card><Card><StatCallout label="User engagement rate" value={`${((analytics?.engagementRate ?? 0) * 100).toFixed(1)}%`} /><span className="gf-caption">Registered users with expense or habit-log activity in the last 7 days.</span></Card></>}</div>}
    {userDetail && <div className="modal-backdrop"><Card className="confirmation-modal"><div className="modal-heading"><h2>User detail</h2><button className="icon-button" onClick={() => setUserDetail(null)} aria-label="Close">×</button></div><p><strong>{userDetail.name}</strong></p><p>{userDetail.email}</p><p>Role: {userDetail.role}</p><p>Status: {userDetail.deletedAt ? 'Suspended' : 'Active'}</p><p className="gf-caption">Created {formatDate(userDetail.createdAt)}</p><Button variant="secondary" onClick={() => setUserDetail(null)}>Close</Button></Card></div>}
    {reopenTarget && <div className="modal-backdrop"><Card className="confirmation-modal"><h2>Reopen resolved feedback?</h2><p>This requires an explicit force flag and will move the item back to open.</p><div className="modal-actions"><Button variant="secondary" onClick={() => setReopenTarget(null)}>Cancel</Button><Button variant="destructive" onClick={() => updateFeedback(reopenTarget, 'open', true)}>Reopen</Button></div></Card></div>}
  </div>
}
