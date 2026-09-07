import { BarChart3, CircleDollarSign, LayoutDashboard, ListChecks, Menu, Plus, Shield, Target, UserRound, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { Button } from '../ui'

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
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={24} /></button><h1>{title}</h1><div className="topbar-actions">{(isExpensePage || isHabitPage || isGoalsPage || isAnalyticsPage) && <Button className="quick-add" onClick={() => setQuickAddOpen(true)}><Plus size={20} /> {isExpensePage ? 'Add Expense' : isHabitPage ? 'Add Habit' : isGoalsPage ? 'Add Goal' : 'Add Asset'}</Button>}<button className="profile-button" onClick={logout} title="Sign out"><UserRound size={24} /><span>{user?.name}</span></button></div></header>
      <nav className="mobile-tab-bar" aria-label="Mobile navigation">{visibleNavItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `mobile-tab ${isActive ? 'mobile-tab-active' : ''}`}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
      <main className="main-content"><Outlet context={{ quickAddOpen, setQuickAddOpen }} /></main>
    </div>
  </div>
}
