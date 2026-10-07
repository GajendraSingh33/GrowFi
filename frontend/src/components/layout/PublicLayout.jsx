import { Outlet } from 'react-router-dom'
import { PublicHeader } from './PublicHeader'
import { Footer } from './Footer'

export function PublicLayout() {
  return (
    <div className="public-layout">
      <PublicHeader />
      <main className="public-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
