import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Badge, Button, Card } from '../components/ui'

export function LoginPage({ initialMode = 'login' }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setMode(initialMode)
    setError('')
    setFieldErrors({})
  }, [initialMode])

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  function handleSwitchMode() {
    const nextMode = mode === 'login' ? 'register' : 'login'
    setMode(nextMode)
    setError('')
    setFieldErrors({})
    navigate(nextMode === 'login' ? '/login' : '/register')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setFieldErrors({})
    const errors = {}
    if (mode === 'register' && !form.name.trim()) errors.name = 'Name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email'
    if (form.password.length < 8 || !/\d/.test(form.password)) errors.password = 'Use at least 8 characters and 1 number'
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }
    setSubmitting(true)
    try {
      await (mode === 'login' ? login({ email: form.email, password: form.password }) : register(form))
      navigate('/dashboard')
    } catch (requestError) {
      setError(requestError.userMessage || 'An error occurred during authentication')
      setFieldErrors(requestError.fieldErrors || {})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-illustration" aria-hidden="true">✦</div>
      <Card className="auth-card">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark">G</span>
          <span>GrowFi</span>
        </Link>
        <h1>{mode === 'login' ? 'Welcome back' : 'Build your wealth habits'}</h1>
        <p className="auth-copy">
          {mode === 'login'
            ? 'Sign in to access your financial dashboard and habit tracker.'
            : 'A calmer way to understand your money and grow what matters.'}
        </p>

        {error && <Badge tone="danger">{error}</Badge>}

        <form onSubmit={submit} noValidate>
          {mode === 'register' && (
            <label>
              Name
              <input name="name" value={form.name} onChange={update} placeholder="Jane Doe" />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={update} placeholder="name@example.com" />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </label>
          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={update} placeholder="••••••••" />
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </label>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <button className="text-button auth-switch" onClick={handleSwitchMode}>
          {mode === 'login' ? 'Create a GrowFi account' : 'Already have an account? Sign in'}
        </button>
      </Card>
    </div>
  )
}
