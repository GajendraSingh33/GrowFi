import { ArrowRight, CheckCircle2, Heart, Shield, Sparkles, Target, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Button, Card } from '../components/ui'

export function AboutPage() {
  const { user } = useAuth()

  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="section-container">
          <span className="hero-badge">About GrowFi</span>
          <h1>Empowering intentional financial habits & sustainable wealth growth</h1>
          <p className="about-lead">
            GrowFi was created to bridge the gap between traditional budgeting apps and behavioral habit building. We believe that true financial freedom isn't built overnight—it is built through daily, conscious money choices.
          </p>
        </div>
      </section>

      <section className="about-section">
        <div className="section-container">
          <div className="about-grid">
            <Card className="about-card">
              <div className="about-card-icon"><Zap size={24} /></div>
              <h3>The Problem We Solve</h3>
              <p>
                Traditional personal finance software is often overwhelming, cluttered with complex charts, or focused solely on past expenses. Most people abandon budgeting tools within weeks because they lack habit-focused encouragement and positive reinforcement.
              </p>
            </Card>

            <Card className="about-card">
              <div className="about-card-icon"><Sparkles size={24} /></div>
              <h3>The GrowFi Solution</h3>
              <p>
                GrowFi combines real-time expense tracking with daily financial habits, goal milestones, and net worth progress. By making daily tracking effortless and rewarding positive financial streaks, GrowFi keeps you engaged and motivated.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="about-capabilities-section">
        <div className="section-container">
          <div className="section-header">
            <h2>Main Product Capabilities</h2>
            <p>Designed to give you clarity without the stress.</p>
          </div>

          <div className="capabilities-list">
            <div className="capability-item">
              <CheckCircle2 className="gf-tone-primary" size={20} />
              <div>
                <h4>Daily Financial Habit Building</h4>
                <p>Track micro-habits like avoiding impulse purchases, logging receipts daily, or transferring small savings to build long-term momentum.</p>
              </div>
            </div>

            <div className="capability-item">
              <CheckCircle2 className="gf-tone-primary" size={20} />
              <div>
                <h4>Intuitive Cash Flow Management</h4>
                <p>Keep a clear record of your income sources and categorized expenses so you always know your net savings rate.</p>
              </div>
            </div>

            <div className="capability-item">
              <CheckCircle2 className="gf-tone-primary" size={20} />
              <div>
                <h4>Visual Savings Milestones</h4>
                <p>Define clear target goals for emergency funds, major purchases, or investments, and watch your progress ring fill up.</p>
              </div>
            </div>

            <div className="capability-item">
              <CheckCircle2 className="gf-tone-primary" size={20} />
              <div>
                <h4>Net Worth & Asset Analytics</h4>
                <p>Get a high-level picture of your overall financial standing by tracking assets against liabilities over time.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-why-matters">
        <div className="section-container">
          <Card className="why-matters-card">
            <h2>Why Financial Habits Matter</h2>
            <p>
              Small daily financial decisions compound into massive long-term wealth. When you track expenses and celebrate daily consistency, you build financial discipline effortlessly. GrowFi gives you the tools and structure to build a calmer, wealthier future.
            </p>
            <div style={{ marginTop: '24px' }}>
              {user ? (
                <Link to="/dashboard">
                  <Button variant="primary">Explore Your Dashboard <ArrowRight size={18} /></Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button variant="primary">Start Your Journey Today <ArrowRight size={18} /></Button>
                </Link>
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
