import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { AppShell } from './components/layout/AppShell'
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

function LoginRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" replace /> : <LoginPage />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRedirect />} />
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
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
