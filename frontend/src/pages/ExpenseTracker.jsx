import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import api from '../api'
import { Badge, Button, Card, EmptyState, Modal, Skeleton, StatCallout, Table } from '../components/ui'

function newExpenseForm() {
  return { amount: '', description: '', categoryId: '', expenseDate: new Date().toISOString().slice(0, 10) }
}

function fieldError(errors, field) {
  return errors[field] ? <span className="field-error">{errors[field]}</span> : null
}

function validateExpense(form) {
  const errors = {}
  if (!/^\d+(\.\d{1,2})?$/.test(form.amount) || Number(form.amount) <= 0) errors.amount = 'Amount must be positive'
  if (!form.categoryId) errors.categoryId = 'Choose a category'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expenseDate)) errors.expenseDate = 'Use a valid date'
  return errors
}

export function ExpenseTracker() {
  const { quickAddOpen, setQuickAddOpen } = useOutletContext()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState({ items: [], totalAmount: '0.00' })
  const [filters, setFilters] = useState({ categoryId: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [pageInfo, setPageInfo] = useState({ page: 1, pageSize: 25, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState(newExpenseForm)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')

  const currentMonth = new Date().toISOString().slice(0, 7)
  const topCategory = useMemo(() => summary.items.reduce((top, item) => Number(item.totalAmount) > Number(top?.totalAmount || 0) ? item : top, null), [summary])

  const loadCategories = useCallback(async () => {
    const { data } = await api.get('/api/expense-categories')
    setCategories(data.data)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, pageSize: 25 }
      if (filters.categoryId) params.categoryId = filters.categoryId
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const [expensesResponse, summaryResponse] = await Promise.all([
        api.get('/api/expenses', { params }),
        api.get('/api/expenses/summary', { params: { month: currentMonth } }),
      ])
      setItems(expensesResponse.data.data.items)
      setPageInfo(expensesResponse.data.data)
      setSummary(summaryResponse.data.data)
    } catch (requestError) {
      setError(requestError.userMessage)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, filters, page])

  useEffect(() => {
    void Promise.resolve().then(() => loadCategories().catch((requestError) => setError(requestError.userMessage)))
  }, [loadCategories])

  useEffect(() => {
    void Promise.resolve().then(loadData)
  }, [loadData])

  function openCreate() {
    setEditing(null)
    setForm(newExpenseForm())
    setFormError('')
    setFieldErrors({})
    setQuickAddOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      amount: String(item.amount),
      description: item.description || '',
      categoryId: item.categoryId,
      expenseDate: String(item.expenseDate).slice(0, 10),
    })
    setFormError('')
    setFieldErrors({})
  }

  async function submitExpense(event) {
    event.preventDefault()
    const errors = validateExpense(form)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }
    try {
      const path = editing ? `/api/expenses/${editing.expenseId}` : '/api/expenses'
      await (editing ? api.put(path, form) : api.post(path, form))
      setEditing(null)
      setQuickAddOpen(false)
      await loadData()
    } catch (requestError) {
      setFormError(requestError.userMessage)
      setFieldErrors(requestError.fieldErrors || {})
    }
  }

  async function deleteExpense() {
    try {
      await api.delete(`/api/expenses/${deleteTarget.expenseId}`)
      setDeleteTarget(null)
      await loadData()
    } catch (requestError) {
      setError(requestError.userMessage)
      setDeleteTarget(null)
    }
  }

  async function addCategory() {
    if (!categoryName.trim()) return
    try {
      const { data } = await api.post('/api/expense-categories', { name: categoryName.trim() })
      setCategories((current) => [...current, data.data])
      setForm((current) => ({ ...current, categoryId: data.data.categoryId }))
      setCategoryName('')
      setCategoryError('')
    } catch (requestError) {
      setCategoryError(requestError.userMessage)
    }
  }

  async function deleteCategory(category) {
    try {
      await api.delete(`/api/expense-categories/${category.categoryId}`)
      setCategories((current) => current.filter((item) => item.categoryId !== category.categoryId))
      if (form.categoryId === category.categoryId) setForm((current) => ({ ...current, categoryId: '' }))
      setCategoryError('')
    } catch (requestError) {
      setCategoryError(requestError.userMessage)
    }
  }

  const totalPages = Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))
  const showEditor = editing || quickAddOpen

  return <div className="expense-page">
    {error && <Badge tone="danger">{error}</Badge>}
    <div className="stat-grid expense-stat-grid"><Card><StatCallout label="Total spent this month" value={`₹${summary.totalAmount}`} /></Card><Card><StatCallout label="Top spending category" value={topCategory?.name || '—'} /></Card></div>
    <Card className="expense-table-card">
      <div className="expense-toolbar"><div className="filter-grid"><label>Category<select value={filters.categoryId} onChange={(event) => { setPage(1); setFilters({ ...filters, categoryId: event.target.value }) }}><option value="">All categories</option>{categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}</select></label><label>From<input type="date" value={filters.from} onChange={(event) => { setPage(1); setFilters({ ...filters, from: event.target.value }) }} /></label><label>To<input type="date" value={filters.to} onChange={(event) => { setPage(1); setFilters({ ...filters, to: event.target.value }) }} /></label><Button variant="secondary" onClick={() => { setFilters({ categoryId: '', from: '', to: '' }); setPage(1) }}>Clear filters</Button></div></div>
      {loading ? <div className="expense-skeletons"><Skeleton className="skeleton-row" /><Skeleton className="skeleton-row" /><Skeleton className="skeleton-row" /></div> : !items.length && !filters.categoryId && !filters.from && !filters.to ? <EmptyState title="Add your first expense — it takes 30 seconds" action="Add Expense" onAction={openCreate} /> : <><Table headers={['Date', 'Description', 'Category', 'Amount', 'Actions']}><>{items.map((item) => <tr key={item.expenseId}><td>{String(item.expenseDate).slice(0, 10)}</td><td>{item.description || '—'}</td><td><Badge>{item.category?.name || 'Uncategorized'}</Badge></td><td className="numeric-cell">₹{item.amount}</td><td><div className="row-actions"><button className="icon-button" onClick={() => openEdit(item)} aria-label={`Edit ${item.description || 'expense'}`}><Pencil size={20} /></button><button className="icon-button danger-icon" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.description || 'expense'}`}><Trash2 size={20} /></button></div></td></tr>)}</></Table><div className="pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="gf-caption">Page {page} of {totalPages}</span><Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></>}
    </Card>
    {showEditor && <Modal className="expense-modal" onClose={() => { setEditing(null); setQuickAddOpen(false) }}><div className="modal-heading"><h2>{editing ? 'Edit expense' : 'Add expense'}</h2><button className="icon-button" onClick={() => { setEditing(null); setQuickAddOpen(false) }} aria-label="Close"><X size={20} /></button></div>{formError && <Badge tone="danger">{formError}</Badge>}<form className="expense-form" onSubmit={submitExpense}><label>Amount<input name="amount" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />{fieldError(fieldErrors, 'amount')}</label><label>Description<input name="description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />{fieldError(fieldErrors, 'description')}</label><label>Category<select name="categoryId" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Choose a category</option>{categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}</select>{fieldError(fieldErrors, 'categoryId')}</label><div className="category-manager"><div className="category-add-row"><input placeholder="New custom category" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /><Button variant="secondary" type="button" onClick={addCategory}>Add category</Button></div>{categoryError && <Badge tone="danger">{categoryError}</Badge>}<div className="category-list">{categories.filter((category) => !category.isDefault).map((category) => <span key={category.categoryId} className="category-management-item"><Badge>{category.name}</Badge><button type="button" className="icon-button danger-icon" onClick={() => deleteCategory(category)} aria-label={`Delete ${category.name}`}><Trash2 size={16} /></button></span>)}</div></div><label>Date<input name="expenseDate" type="date" value={form.expenseDate} onChange={(event) => setForm({ ...form, expenseDate: event.target.value })} />{fieldError(fieldErrors, 'expenseDate')}</label><Button type="submit">{editing ? 'Save expense' : 'Add expense'}</Button></form></Modal>}
    {deleteTarget && <Modal className="confirmation-modal" onClose={() => setDeleteTarget(null)}><h2>Delete this expense?</h2><p>This action cannot be undone.</p><div className="modal-actions"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" onClick={deleteExpense}>Delete expense</Button></div></Modal>}
  </div>
}
