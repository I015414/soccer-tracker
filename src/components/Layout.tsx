import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { isAdmin } from '../lib/auth'
import { logout } from '../lib/auth'

interface Props {
  session: Session
}

export default function Layout({ session }: Props) {
  const navigate = useNavigate()
  const admin = isAdmin(session.user.email)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: 'url(/soccer-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay to keep content readable */}
      <div className="min-h-screen bg-white/70 backdrop-blur-[1px]">
        <header className="bg-white/90 border-b border-gray-200 sticky top-0 z-10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-800">⚽ Soccer at Ellis</span>
              <nav className="flex items-center gap-1">
                <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
                {admin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {admin ? '🔑 Admin' : session.user.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
