import { BarChart3, ChevronDown, CircleDollarSign, LayoutDashboard, ListChecks, LogOut, Menu, Plus, Shield, Target, UserRound, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { Button } from '../ui'
import { Footer } from './Footer'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expenses', label: 'Expenses', icon: CircleDollarSign },
  { to: '/habits', label: 'Habits', icon: ListChecks },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function AppShell() {
  const { user, logout, refreshUser } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileRef = useRef(null)

  const location = useLocation()
  const title = location.pathname === '/dashboard'
    ? 'Financial Dashboard'
    : location.pathname === '/expenses'
      ? 'Expense Tracker'
      : location.pathname === '/habits'
        ? 'Habit Tracker'
        : location.pathname === '/goals'
          ? 'Savings Goals'
        : location.pathname === '/analytics'
          ? 'Wealth Analytics'
      : navItems.find((item) => location.pathname.startsWith(item.to))?.label || 'Admin Panel'
  const isExpensePage = location.pathname === '/expenses'
  const isHabitPage = location.pathname === '/habits'
  const isGoalsPage = location.pathname === '/goals'
  const isAnalyticsPage = location.pathname === '/analytics'

  useEffect(() => {
    void refreshUser().catch(() => {})
  }, [location.key, refreshUser])

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const visibleNavItems = [...navItems, ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Shield }] : [])]

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark">G</span><span>GrowFi</span><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={24} /></button></div>
      <nav className="primary-nav" aria-label="Primary navigation">
        {visibleNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}><Icon size={24} /><span>{label}</span></NavLink>
        ))}
      </nav>
    </aside>
    {mobileOpen && <button className="shell-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <div className="shell-content">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={24} /></button>
        <h1>{title}</h1>
        <div className="topbar-actions">
          {(isExpensePage || isHabitPage || isGoalsPage || isAnalyticsPage) && <Button className="quick-add" onClick={() => setQuickAddOpen(true)}><Plus size={20} /> {isExpensePage ? 'Add Expense' : isHabitPage ? 'Add Habit' : isGoalsPage ? 'Add Goal' : 'Add Asset'}</Button>}
          <div
            className="profile-menu-container"
            ref={profileRef}
            onMouseEnter={() => setProfileMenuOpen(true)}
            onMouseLeave={() => setProfileMenuOpen(false)}
          >
            <button
              className="profile-button"
              onClick={() => setProfileMenuOpen(true)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="true"
              aria-label="User profile menu"
            >
              <div className="profile-avatar"><UserRound size={18} /></div>
              <span className="profile-name">{user?.name}</span>
              <ChevronDown size={16} className={`profile-chevron ${profileMenuOpen ? 'chevron-open' : ''}`} />
            </button>
            {profileMenuOpen && (
              <div className="profile-dropdown" role="menu">
                <button
                  className="profile-dropdown-action"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    logout()
                  }}
                  role="menuitem"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <nav className="mobile-tab-bar" aria-label="Mobile navigation">{visibleNavItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `mobile-tab ${isActive ? 'mobile-tab-active' : ''}`}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
      <main className="main-content"><Outlet context={{ quickAddOpen, setQuickAddOpen }} /></main>
      <Footer />
    </div>
  </div>
}
