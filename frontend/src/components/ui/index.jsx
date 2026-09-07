import { useEffect, useRef } from 'react'

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return <button className={`gf-button gf-button-${variant} ${className}`} {...props}>{children}</button>
}

export function Card({ className = '', children, ...props }) {
  return <section className={`gf-card ${className}`} {...props}>{children}</section>
}

export function Modal({ className = '', onClose, children }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const focusable = dialog?.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')
    focusable?.[0]?.focus()
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    const focusable = dialog?.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return <div className="modal-backdrop"><div ref={dialogRef} className={`gf-card ${className}`} role="dialog" aria-modal="true">{children}</div></div>
}

export function StatCallout({ label, value, tone = 'primary' }) {
  return <div className="gf-stat"><div className={`gf-stat-value gf-tone-${tone}`}>{value}</div><div className="gf-stat-label">{label}</div></div>
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`gf-badge gf-badge-${tone}`}>{children}</span>
}

export function ProgressIndicator({ value, variant = 'bar', tone = 'primary', label }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  if (variant === 'ring') {
    return <div className={`gf-progress-ring gf-ring-${tone}`} style={{ '--progress': `${safeValue * 3.6}deg` }} aria-label={`${safeValue}% complete`}><span>{Math.round(safeValue)}%</span></div>
  }
  return <div className="gf-progress-wrap"><div className="gf-progress-track"><div className={`gf-progress-fill gf-fill-${tone}`} style={{ width: `${safeValue}%` }} /></div>{label && <span className="gf-caption">{label}</span>}</div>
}

export function Table({ headers, children }) {
  return <div className="gf-table-wrap"><table className="gf-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}

export function EmptyState({ title, action, onAction }) {
  return <div className="gf-empty"><div className="gf-empty-art" aria-hidden="true">✦</div><h2>{title}</h2>{action && <Button onClick={onAction}>{action}</Button>}</div>
}

export function Skeleton({ className = '' }) {
  return <div className={`gf-skeleton ${className}`} aria-hidden="true" />
}
