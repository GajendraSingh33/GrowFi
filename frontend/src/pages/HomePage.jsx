import { ArrowRight, BarChart3, CheckCircle2, ChevronDown, CircleDollarSign, ListChecks, ShieldCheck, Sparkles, Target, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Button, Card } from '../components/ui'

export function HomePage() {
  const { user } = useAuth()

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg-glow" aria-hidden="true" />
        <div className="hero-container">
          <div className="hero-content">
            <span className="hero-badge">
              <Sparkles size={16} /> Smarter Personal Finance
            </span>
            <h1 className="hero-title">
              Financial Habit Builder & Wealth Growth Tracker
            </h1>
            <p className="hero-subtitle">
              Build consistent money habits, track daily expenses, set target savings goals, and visualize your growing net worth—all in one calm, intuitive dashboard.
            </p>
            <div className="hero-cta-group">
              {user ? (
                <Link to="/dashboard">
                  <Button variant="primary" className="hero-btn">
                    Go to Your Dashboard <ArrowRight size={18} />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button variant="primary" className="hero-btn">
                      Get Started Free <ArrowRight size={18} />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="secondary" className="hero-btn">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <div className="hero-trust-bar">
              <div className="trust-rating">
                <span className="stars">★★★★★</span>
                <span className="rating-text">4.9/5 Rating</span>
              </div>
              <span className="trust-divider">•</span>
              <span className="trust-item"><CheckCircle2 size={15} className="gf-tone-success" /> Free Forever Tier</span>
              <span className="trust-divider">•</span>
              <span className="trust-item"><CheckCircle2 size={15} className="gf-tone-success" /> Bank-Grade Security</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-glow-sphere" aria-hidden="true" />

            {/* Floating Top Badge */}
            <div className="hero-floating-card floating-top">
              <div className="floating-icon success"><TrendingUp size={16} /></div>
              <div>
                <span className="floating-label">Daily Savings Habit</span>
                <span className="floating-val">+$25.00 saved today</span>
              </div>
            </div>

            {/* Main Preview Card */}
            <Card className="hero-card-preview">
              <div className="hero-preview-header">
                <div>
                  <span className="gf-caption">Total Net Worth</span>
                  <div className="hero-preview-amount">$48,250.00</div>
                </div>
                <span className="hero-preview-badge">+12.4% this month</span>
              </div>

              {/* Mini Sparkline Chart */}
              <div className="hero-mini-chart">
                <div className="mini-chart-bar" style={{ height: '35%' }} />
                <div className="mini-chart-bar" style={{ height: '50%' }} />
                <div className="mini-chart-bar" style={{ height: '42%' }} />
                <div className="mini-chart-bar" style={{ height: '65%' }} />
                <div className="mini-chart-bar" style={{ height: '60%' }} />
                <div className="mini-chart-bar" style={{ height: '80%' }} />
                <div className="mini-chart-bar active" style={{ height: '100%' }} />
              </div>

              <div className="hero-preview-stats">
                <div className="preview-stat-item">
                  <span className="gf-caption">Monthly Income</span>
                  <strong className="gf-tone-success">+$6,400.00</strong>
                </div>
                <div className="preview-stat-item">
                  <span className="gf-caption">Monthly Expenses</span>
                  <strong className="gf-tone-danger">-$2,150.00</strong>
                </div>
                <div className="preview-stat-item">
                  <span className="gf-caption">Habit Streak</span>
                  <strong className="gf-tone-primary">14 Days 🔥</strong>
                </div>
              </div>
            </Card>

            {/* Floating Bottom Badge */}
            <div className="hero-floating-card floating-bottom">
              <div className="floating-icon primary"><CheckCircle2 size={16} /></div>
              <div>
                <span className="floating-label">Emergency Fund</span>
                <span className="floating-val">85% Goal Reached 🎯</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="hero-scroll-prompt">
          <span>Scroll to explore</span>
          <ChevronDown size={16} className="scroll-arrow" />
        </div>
      </section>

      {/* Capabilities / Management Section */}
      <section className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2>Everything you need to master your money</h2>
            <p>GrowFi combines behavioral habit science with real-time financial tracking.</p>
          </div>

          <div className="features-grid">
            <Card className="feature-card">
              <div className="feature-icon-wrap">
                <CircleDollarSign size={24} />
              </div>
              <h3>Income & Expenses</h3>
              <p>Categorize transactions, monitor recurring bills, and keep track of daily cash flow effortlessly.</p>
            </Card>

            <Card className="feature-card">
              <div className="feature-icon-wrap">
                <ListChecks size={24} />
              </div>
              <h3>Financial Habits</h3>
              <p>Build daily micro-habits—like logging transactions or saving small amounts—and maintain active streaks.</p>
            </Card>

            <Card className="feature-card">
              <div className="feature-icon-wrap">
                <Target size={24} />
              </div>
              <h3>Savings Goals</h3>
              <p>Set target milestones for emergency funds, vacations, or investments with automated progress tracking.</p>
            </Card>

            <Card className="feature-card">
              <div className="feature-icon-wrap">
                <BarChart3 size={24} />
              </div>
              <h3>Wealth & Net Worth</h3>
              <p>Track your total assets vs. liabilities to see your true financial trajectory improve over time.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="workflow-section">
        <div className="section-container">
          <div className="section-header">
            <h2>How GrowFi Works</h2>
            <p>Three simple steps toward total financial clarity and intentional habit building.</p>
          </div>

          <div className="workflow-steps">
            <div className="step-card">
              <span className="step-number">1</span>
              <h4>Track Daily Transactions</h4>
              <p>Log income and expenses quickly to stay mindful of where every dollar goes.</p>
            </div>
            <div className="step-card">
              <span className="step-number">2</span>
              <h4>Form Intentional Habits</h4>
              <p>Check off daily financial habits and watch your streaks grow stronger over time.</p>
            </div>
            <div className="step-card">
              <span className="step-number">3</span>
              <h4>Watch Your Wealth Grow</h4>
              <p>Reach milestone goals and monitor your expanding net worth with clean visual analytics.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
