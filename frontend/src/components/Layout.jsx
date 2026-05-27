import { Outlet, NavLink } from 'react-router-dom'

function Layout({ handleLogout }) {
  const linkClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 px-4 py-3 rounded-xl text-xs font-medium transition-colors ${
      isActive
        ? 'text-blue-600 bg-blue-50'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`

  const sidebarLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'text-blue-600 bg-blue-50'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-56 md:bg-white md:shadow-lg md:z-30">
        <div className="px-6 py-6">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Strigula
          </h1>
          <p className="text-xs text-gray-400 mt-1">Tartozás nyilvántartó</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <NavLink to="/dashboard" className={sidebarLinkClass}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Barátok
          </NavLink>
        </nav>
        <div className="px-3 pb-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Kilépés
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-56 pb-24 md:pb-0 min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">Strigula</h1>
            <p className="text-xs text-gray-400">Tartozás nyilvántartó</p>
          </div>
        </header>

        <div className="p-4">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30 flex justify-around py-2 safe-area-bottom">
        <NavLink to="/dashboard" className={linkClass}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Barátok</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Kilépés</span>
        </button>
      </nav>
    </div>
  )
}

export default Layout
