import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarIcon, GearIcon, HomeIcon, ListIcon } from './Icons'
import { Celebration } from './Celebration'

const tabs = [
  { to: '/', label: 'Casa', Icon: HomeIcon, end: true },
  { to: '/calendario', label: 'Calendario', Icon: CalendarIcon },
  { to: '/attivita', label: 'Attività', Icon: ListIcon },
  { to: '/profilo', label: 'Profilo', Icon: GearIcon },
]

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-lg px-4 pt-4 pb-32">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex w-full max-w-md gap-1 rounded-full border border-line bg-card/85 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {tabs.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-bold transition-colors ${
                  isActive ? 'bg-bg text-accent' : 'text-sub'
                }`
              }
            >
              <Icon width={22} height={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Celebration />
    </div>
  )
}

export function PageHeader({ title, left, right }: { title: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="mb-5 flex items-center gap-3">
      {left}
      <h1 className="flex-1 truncate text-2xl font-black">{title}</h1>
      {right}
    </header>
  )
}

export function RoundButton({
  onClick,
  label,
  children,
  accent = false,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`pressable flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
        accent ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-card2 text-ink'
      }`}
    >
      {children}
    </button>
  )
}
