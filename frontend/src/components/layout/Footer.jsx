import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export function Footer() {
  const { user } = useAuth()
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand-section">
          <NavLink to="/" className="brand footer-brand">
            <span className="brand-mark">G</span>
            <span>GrowFi</span>
          </NavLink>
          <p className="footer-tagline">
            Financial Habit Builder & Wealth Growth Tracker
          </p>
        </div>

        <div className="footer-links-section">
          <div className="footer-nav-group">
            <span className="footer-group-title">Navigation</span>
            <NavLink to="/" className="footer-link">Home</NavLink>
            <NavLink to="/about" className="footer-link">About Us</NavLink>
            <NavLink to="/blog" className="footer-link">Blog</NavLink>
          </div>

          <div className="footer-nav-group">
            <span className="footer-group-title">Account</span>
            {user ? (
              <NavLink to="/dashboard" className="footer-link">Dashboard</NavLink>
            ) : (
              <>
                <NavLink to="/login" className="footer-link">Login</NavLink>
                <NavLink to="/register" className="footer-link">Sign Up</NavLink>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {year} GrowFi. All rights reserved.</p>
      </div>
    </footer>
  )
}
