import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HouseholdProvider, useHousehold } from './contexts/HouseholdContext'
import { HomeProvider } from './contexts/HomeContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Onboarding } from './pages/Onboarding'
import { Home } from './pages/Home'
import { NewRoom } from './pages/NewRoom'
import { RoomDetail } from './pages/RoomDetail'
import { Calendar } from './pages/Calendar'
import { Activities } from './pages/Activities'
import { Settings } from './pages/Settings'

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span className="animate-sway text-5xl">🧹</span>
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Login />
  return (
    <HouseholdProvider key={user.id}>
      <HouseholdGate />
    </HouseholdProvider>
  )
}

function HouseholdGate() {
  const { currentHousehold, loading } = useHousehold()
  if (loading) return <Splash />
  if (!currentHousehold) return <Onboarding />
  return (
    <HomeProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="stanze/nuova" element={<NewRoom />} />
          <Route path="stanze/:id" element={<RoomDetail />} />
          <Route path="calendario" element={<Calendar />} />
          <Route path="attivita" element={<Activities />} />
          <Route path="profilo" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HomeProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
