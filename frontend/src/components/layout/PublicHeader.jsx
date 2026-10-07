import { Menu, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { Button } from '../ui'

export function PublicHeader() {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="public-header">
      <div className="public-header-container">
        <Link to="/" className="brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark">G</span>
          <span>GrowFi</span>
        </Link>

        <nav className="public-nav-desktop" aria-label="Public desktop navigation">
          <NavLink to="/" className={({ isActive }) => `public-nav-link ${isActive ? 'active' : ''}`} end>
            Home
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `public-nav-link ${isActive ? 'active' : ''}`}>
            About Us
          </NavLink>
          <NavLink to="/blog" className={({ isActive }) => `public-nav-link ${isActive ? 'active' : ''}`}>
            Blog
          </NavLink>
        </nav>

        <div className="public-header-actions">
          {user ? (
            <Link to="/dashboard">
              <Button variant="primary">
                <UserRound size={16} /> Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="public-nav-link login-link">
                Login
              </Link>
              <Link to="/register">
                <Button variant="primary">Sign Up</Button>
              </Link>
            </>
          )}
          <button
            className="public-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="public-nav-mobile" aria-label="Public mobile navigation">
          <NavLink to="/" className="public-mobile-link" onClick={() => setMobileOpen(false)} end>
            Home
          </NavLink>
          <NavLink to="/about" className="public-mobile-link" onClick={() => setMobileOpen(false)}>
            About Us
          </NavLink>
          <NavLink to="/blog" className="public-mobile-link" onClick={() => setMobileOpen(false)}>
            Blog
          </NavLink>
          <div className="public-mobile-actions">
            {user ? (
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" style={{ width: '100%' }}>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="secondary" style={{ width: '100%' }}>Login</Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" style={{ width: '100%' }}>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
