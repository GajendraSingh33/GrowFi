import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api'
import { Badge, Button, Card, EmptyState, Modal, Skeleton, StatCallout, Table } from '../components/ui'

const emptyForm = { assetType: 'savings', assetName: '', currentValue: '', lastUpdated: new Date().toISOString().slice(0, 10) }
const ranges = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, All: null }

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`))
}

function rangeDates(range) {
  if (!ranges[range]) return {}
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - ranges[range])
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function validateAsset(form) {
  const errors = {}
  if (!form.assetName.trim()) errors.assetName = 'Asset name is required'
  if (!/^\d+(\.\d{1,2})?$/.test(form.currentValue) || Number(form.currentValue) <= 0) errors.currentValue = 'Value must be positive'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.lastUpdated)) errors.lastUpdated = 'Use a valid date'
  return errors
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return <div className="analytics-tooltip"><strong>{formatDate(point.snapshotDate)}</strong><span>{formatCurrency(point.netWorth)}</span></div>
}

export function WealthAnalytics() {
  const { quickAddOpen, setQuickAddOpen } = useOutletContext()
  const [range, setRange] = useState('1Y')
  const [assets, setAssets] = useState([])
  const [netWorth, setNetWorth] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [netWorthResponse, assetsResponse, historyResponse] = await Promise.all([
        api.get('/api/networth'),
        api.get('/api/assets'),
        api.get('/api/networth/history', { params: rangeDates(range) }),
      ])
      setNetWorth(netWorthResponse.data.data)
      setAssets(assetsResponse.data.data)
      setHistory(historyResponse.data.data)
      setError('')
    } catch (requestError) {
      setError(requestError.userMessage)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { void Promise.resolve().then(loadData) }, [loadData])

  const chartData = useMemo(() => history.map((point) => ({ ...point, netWorth: Number(point.netWorth) })), [history])
  const change = chartData.length > 1 ? chartData[chartData.length - 1].netWorth - chartData[0].netWorth : null
  const showEditor = Boolean(editing || quickAddOpen)
  const isEmpty = !loading && assets.length === 0 && Number(netWorth?.totalSavings || 0) === 0
  const fieldError = (field) => fieldErrors[field] && <span className="field-error">{fieldErrors[field]}</span>

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, lastUpdated: new Date().toISOString().slice(0, 10) })
    setFormError('')
    setFieldErrors({})
    setQuickAddOpen(true)
  }

  function openEdit(asset) {
    setEditing(asset)
    setForm({
      assetType: asset.assetType,
      assetName: asset.assetName,
      currentValue: String(asset.currentValue),
      lastUpdated: String(asset.lastUpdated).slice(0, 10),
    })
    setFormError('')
    setFieldErrors({})
  }

  async function refreshSnapshot() {
      try {
        await api.post('/api/networth/snapshot')
      } catch (requestError) {
        setError(requestError.userMessage)
      }
  }

  async function submitAsset(event) {
    event.preventDefault()
    const errors = validateAsset(form)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }
    try {
      if (editing) await api.put(`/api/assets/${editing.assetId}`, form)
      else await api.post('/api/assets', form)
      await refreshSnapshot()
      setEditing(null)
      setQuickAddOpen(false)
      await loadData()
    } catch (requestError) {
      setFormError(requestError.userMessage)
      setFieldErrors(requestError.fieldErrors || {})
    }
  }

  async function deleteAsset() {
    try {
      await api.delete(`/api/assets/${deleteTarget.assetId}`)
      await refreshSnapshot()
      setDeleteTarget(null)
      await loadData()
    } catch (requestError) {
      setError(requestError.userMessage)
      setDeleteTarget(null)
    }
  }

  return <div className="analytics-page">
    {error && <Badge tone="danger">{error}</Badge>}
    {isEmpty ? <EmptyState title="Add your first asset to start tracking your wealth" action="Add Asset" onAction={openCreate} /> : loading ? <div className="analytics-grid"><Skeleton className="skeleton-stat" /><Skeleton className="skeleton-stat" /><Skeleton className="skeleton-stat" /><Skeleton className="analytics-chart-skeleton" /><Skeleton className="skeleton-card" /></div> : <>
      <div className="stat-grid analytics-stat-grid"><Card><StatCallout label="Current net worth" value={formatCurrency(netWorth?.netWorth)} /></Card><Card><StatCallout label="Change in selected period" value={change === null ? '—' : `${change >= 0 ? '+' : '-'}${formatCurrency(Math.abs(change))}`} tone={change === null || change === 0 ? 'primary' : change > 0 ? 'success' : 'danger'} /></Card><Card><StatCallout label="Tracked assets" value={assets.length} /></Card></div>
      <Card className="analytics-chart-card"><div className="analytics-toolbar"><h2>Net worth trend</h2><div className="range-selector" role="tablist" aria-label="Chart time range">{Object.keys(ranges).map((option) => <Button key={option} variant={range === option ? 'primary' : 'secondary'} onClick={() => setRange(option)}>{option}</Button>)}</div></div>{chartData.length > 1 ? <div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}><XAxis dataKey="snapshotDate" tickFormatter={(value) => formatDate(value).slice(0, 6)} tick={{ fill: 'var(--gf-ink-muted)', fontSize: 13 }} /><YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} tick={{ fill: 'var(--gf-ink-muted)', fontSize: 13 }} /><Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="netWorth" stroke="var(--gf-primary)" strokeWidth={3} dot={{ fill: 'var(--gf-primary)', r: 3 }} /></LineChart></ResponsiveContainer></div> : <div className="analytics-chart-empty">Check back tomorrow to see your wealth trend.</div>}</Card>
      <Card><div className="section-heading"><h2>Asset breakdown</h2></div>{assets.length ? <Table headers={['Type', 'Asset', 'Current value', 'Actions']}><>{assets.map((asset) => <tr key={asset.assetId}><td><Badge>{asset.assetType}</Badge></td><td>{asset.assetName}</td><td className="numeric-cell">{formatCurrency(asset.currentValue)}</td><td><div className="row-actions"><button className="icon-button" onClick={() => openEdit(asset)} aria-label={`Edit ${asset.assetName}`}><Pencil size={20} /></button><button className="icon-button danger-icon" onClick={() => setDeleteTarget(asset)} aria-label={`Delete ${asset.assetName}`}><Trash2 size={20} /></button></div></td></tr>)}</></Table> : <span className="gf-caption">No assets tracked yet.</span>}</Card>
    </>}
    {showEditor && <Modal className="expense-modal" onClose={() => { setEditing(null); setQuickAddOpen(false) }}><div className="modal-heading"><h2>{editing ? 'Edit asset' : 'Add asset'}</h2><button className="icon-button" onClick={() => { setEditing(null); setQuickAddOpen(false) }} aria-label="Close"><X size={20} /></button></div>{formError && <Badge tone="danger">{formError}</Badge>}<form className="expense-form" onSubmit={submitAsset}><label>Asset type<select value={form.assetType} onChange={(event) => setForm({ ...form, assetType: event.target.value })}><option value="savings">Savings</option><option value="investment">Investment</option><option value="property">Property</option><option value="other">Other</option></select></label><label>Asset name<input value={form.assetName} onChange={(event) => setForm({ ...form, assetName: event.target.value })} />{fieldError('assetName')}</label><label>Current value<input inputMode="decimal" value={form.currentValue} onChange={(event) => setForm({ ...form, currentValue: event.target.value })} />{fieldError('currentValue')}</label><label>Last updated<input type="date" value={form.lastUpdated} onChange={(event) => setForm({ ...form, lastUpdated: event.target.value })} />{fieldError('lastUpdated')}</label><Button type="submit">{editing ? 'Save asset' : 'Add asset'}</Button></form></Modal>}
    {deleteTarget && <Modal className="confirmation-modal" onClose={() => setDeleteTarget(null)}><h2>Delete this asset?</h2><p>Your net worth will be recalculated.</p><div className="modal-actions"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" onClick={deleteAsset}>Delete asset</Button></div></Modal>}
  </div>
}
