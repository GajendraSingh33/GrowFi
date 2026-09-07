import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { Card, EmptyState, ProgressIndicator, Skeleton, StatCallout } from '../components/ui'

export function DashboardPage() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/api/dashboard').then(({ data }) => setDashboard(data.data)).catch((requestError) => setError(requestError.userMessage)) }, [])
  if (!dashboard && !error) return <div className="dashboard-grid"><Skeleton className="skeleton-stat" /><Skeleton className="skeleton-stat" /><Skeleton className="skeleton-stat" /><Skeleton className="skeleton-card" /><Skeleton className="skeleton-card" /></div>
  if (error) return <EmptyState title={error} />
  const habits = dashboard.habitSummary?.habits || dashboard.active_habits_summary || []
  const goals = dashboard.goals || dashboard.active_goals_summary || []
  const netWorth = dashboard.netWorth?.netWorth || dashboard.current_net_worth || '0.00'
  return <div className="dashboard-page"><div className="stat-grid"><Card><StatCallout label="Current net worth" value={`₹${netWorth}`} /></Card><Card><StatCallout label="This month's income" value={`₹${dashboard.incomeTotal || dashboard.this_month_income_total || '0.00'}`} /></Card><Card><StatCallout label="This month's expenses" value={`₹${dashboard.expenseTotal || dashboard.this_month_expense_total || '0.00'}`} /></Card></div><div className="dashboard-sections"><section><div className="section-heading"><h2>Habit momentum</h2></div>{habits.length ? <div className="card-grid">{habits.map((habit) => <Card key={habit.habitId || habit.habit_id}><div className="summary-card"><h3>{habit.name}</h3><StatCallout label="Current streak" value={habit.streakCount ?? habit.streak_count ?? 0} /></div></Card>)}</div> : <EmptyState title="Start a habit that grows with you" action="Add a habit" onAction={() => navigate('/habits')} />}</section><section><div className="section-heading"><h2>Savings goals</h2></div>{goals.length ? <div className="card-grid">{goals.map((goal) => <Card key={goal.goalId || goal.goal_id}><h3>{goal.goalName || goal.goal_name}</h3><ProgressIndicator value={goal.percentComplete ?? goal.percent_complete ?? 0} label={`${goal.percentComplete ?? goal.percent_complete ?? 0}% complete`} /></Card>)}</div> : <EmptyState title="Give your money a goal" action="Create a goal" onAction={() => navigate('/goals')} />}</section></div></div>
}
