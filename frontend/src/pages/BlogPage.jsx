import { ArrowRight, BookOpen, Calendar, Clock } from 'lucide-react'
import { Card } from '../components/ui'

const blogPosts = [
  {
    id: 1,
    title: '5 Daily Financial Habits That Accelerate Wealth Growth',
    category: 'Habit Building',
    readTime: '5 min read',
    date: 'Oct 04, 2026',
    excerpt: 'Discover how simple daily routines like logging daily transactions and avoiding impulse spending can compound into thousands in additional savings over time.',
    link: 'https://medium.com/swlh/5-daily-habits-that-will-help-you-grow-your-wealth-71a8b3d0a9e0',
  },
  {
    id: 2,
    title: 'How to Build a Realistic Budget You Can Actually Stick To',
    category: 'Budgeting',
    readTime: '7 min read',
    date: 'Sep 28, 2026',
    excerpt: "Traditional rigid budgets fail because they don't account for real-world flexibility. Learn how to design a flexible cash flow system that works with your lifestyle.",
    link: 'https://medium.com/better-humans/how-to-make-a-budget-that-actually-works-for-you-e0a3d7b6f1c2',
  },
  {
    id: 3,
    title: 'Understanding Net Worth vs. Cash Flow: What Matters More?',
    category: 'Wealth Analytics',
    readTime: '6 min read',
    date: 'Sep 19, 2026',
    excerpt: "Cash flow pays today's bills, but net worth determines long-term financial security. Here is how to balance spending current income while building total equity.",
    link: 'https://medium.com/personal-finance-series/net-worth-vs-cash-flow-which-should-you-focus-on-5b8d2c9e4f7a',
  },
  {
    id: 4,
    title: 'The Psychology of Savings Goals: How Visual Progress Drives Motivation',
    category: 'Psychology',
    readTime: '4 min read',
    date: 'Sep 10, 2026',
    excerpt: 'Seeing visual indicators like progress rings and milestone badges activates dopamine pathways, helping you stay committed to long-term financial targets.',
    link: 'https://medium.com/mind-cafe/the-psychology-behind-saving-money-and-how-to-use-it-to-your-advantage-3c1f9a2b8d45',
  },
  {
    id: 5,
    title: 'Cutting Hidden Subscriptions & Small Expenses Without Feeling Sacrificed',
    category: 'Expense Tracking',
    readTime: '5 min read',
    date: 'Aug 29, 2026',
    excerpt: 'Small recurring leaks can add up to hundreds each month. Learn how an audit of monthly recurring expenses frees up immediate cash for investment goals.',
    link: 'https://medium.com/the-post-grad-survival-guide/how-to-cut-expenses-without-feeling-like-youre-sacrificing-everything-7d2e4f8c1b09',
  },
  {
    id: 6,
    title: 'Long-Term Wealth Analytics: Key Metrics Every Saver Should Watch',
    category: 'Investing',
    readTime: '8 min read',
    date: 'Aug 15, 2026',
    excerpt: 'From savings rate percentage to debt-to-asset ratios, explore the top financial indicators that provide true insight into your financial trajectory.',
    link: 'https://medium.com/swlh/the-key-financial-metrics-you-should-track-to-build-long-term-wealth-9a3b6c2d5e18',
  },
]

export function BlogPage() {
  return (
    <div className="blog-page">
      <section className="blog-hero">
        <div className="section-container">
          <span className="hero-badge">
            <BookOpen size={16} /> GrowFi Blog & Resources
          </span>
          <h1>Insights for Building Wealth & Smarter Money Habits</h1>
          <p className="blog-subtitle">
            Actionable strategies, expert guides, and behavioral finance tips to help you take control of your financial journey.
          </p>
        </div>
      </section>

      <section className="blog-content-section">
        <div className="section-container">
          <div className="blog-grid">
            {blogPosts.map((post) => (
              <Card key={post.id} className="blog-card">
                <div className="blog-card-meta">
                  <span className="blog-category-badge">{post.category}</span>
                  <div className="blog-time-info">
                    <span><Clock size={14} /> {post.readTime}</span>
                    <span>•</span>
                    <span><Calendar size={14} /> {post.date}</span>
                  </div>
                </div>
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="blog-title-link"
                >
                  <h3 className="blog-card-title">{post.title}</h3>
                </a>
                <p className="blog-card-excerpt">{post.excerpt}</p>
                <div className="blog-card-footer">
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="blog-read-more"
                  >
                    Read Article on Medium <ArrowRight size={16} />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
