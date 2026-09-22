import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Inventario', icon: '📦', end: true },
  { to: '/spesa', label: 'Spesa', icon: '🛒' },
  { to: '/ricette', label: 'Ricette', icon: '🍳' },
  { to: '/spese', label: 'Statistiche', icon: '💶' },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙️' },
]

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                isActive ? 'text-green-600' : 'text-gray-500'
              }`
            }
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
