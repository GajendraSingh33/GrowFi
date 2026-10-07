import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { AppShell } from './components/layout/AppShell'
import { PublicLayout } from './components/layout/PublicLayout'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { BlogPage } from './pages/BlogPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminPage } from './pages/AdminPage'
import { ExpenseTracker } from './pages/ExpenseTracker'
import { HabitTracker } from './pages/HabitTracker'
import { SavingsGoals } from './pages/SavingsGoals'
import { WealthAnalytics } from './pages/WealthAnalytics'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-skeleton" aria-label="Loading" />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function AdminRoute() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" replace />
}

function LoginRedirect({ initialMode = 'login' }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-skeleton" aria-label="Loading" />
  return user ? <Navigate to="/dashboard" replace /> : <LoginPage initialMode={initialMode} />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Pages Layout */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/login" element={<LoginRedirect initialMode="login" />} />
            <Route path="/register" element={<LoginRedirect initialMode="register" />} />
          </Route>

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/expenses" element={<ExpenseTracker />} />
              <Route path="/habits" element={<HabitTracker />} />
              <Route path="/goals" element={<SavingsGoals />} />
              <Route path="/analytics" element={<WealthAnalytics />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
