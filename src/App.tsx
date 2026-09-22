import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HouseholdProvider, useHousehold } from './contexts/HouseholdContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Onboarding } from './pages/Onboarding'
import { Inventory } from './pages/Inventory'
import { AddItem } from './pages/AddItem'
import { ReceiptScan } from './pages/ReceiptScan'
import { ItemDetail } from './pages/ItemDetail'
import { ShoppingList } from './pages/ShoppingList'
import { Recipes } from './pages/Recipes'
import { Expenses } from './pages/Expenses'
import { Settings } from './pages/Settings'

function AppRoutes() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-gray-400">Caricamento...</div>
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <HouseholdProvider>
      <HouseholdGate />
    </HouseholdProvider>
  )
}

function HouseholdGate() {
  const { currentHousehold, loading } = useHousehold()

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-gray-400">Caricamento...</div>
  }

  if (!currentHousehold) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inventory />} />
        <Route path="spesa" element={<ShoppingList />} />
        <Route path="ricette" element={<Recipes />} />
        <Route path="spese" element={<Expenses />} />
        <Route path="impostazioni" element={<Settings />} />
      </Route>
      <Route path="aggiungi" element={<AddItem />} />
      <Route path="scontrino" element={<ReceiptScan />} />
      <Route path="articolo/:id" element={<ItemDetail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
