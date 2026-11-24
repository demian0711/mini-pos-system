import { useState } from 'react'
import { History, LayoutGrid, LogOut, Package, UserRound } from 'lucide-react'
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { getSession, saveSession } from './api'
import { Brand } from './components/ui'
import Login from './pages/Login'
import Pos from './pages/Pos'
import Orders from './pages/Orders'
import Products from './pages/Products'

const links = [
  { to: '/pos', label: 'Bán hàng (POS)', icon: LayoutGrid },
  { to: '/orders', label: 'Lịch sử đơn hàng', icon: History },
  { to: '/products', label: 'Quản lý sản phẩm', icon: Package, admin: true },
]

function Layout({ session, onLogout }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink className="brand-link" to="/pos" aria-label="Mini POS"><Brand /></NavLink>
          <nav className="main-nav" aria-label="Điều hướng chính">
            {links.filter((link) => !link.admin || session.role === 'ADMIN').map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}><Icon size={17} /> <span>{label}</span></NavLink>
            ))}
          </nav>
          <div className="account">
            <span className="avatar" aria-hidden="true"><UserRound size={17} /></span>
            <span className="account-name"><strong>{session.fullName}</strong><small>{session.role}</small></span>
            <button className="logout" type="button" title="Đăng xuất" aria-label="Đăng xuất" onClick={onLogout}><LogOut size={18} /><span>Đăng xuất</span></button>
          </div>
        </div>
      </header>
      <main className="page-shell"><Outlet /></main>
    </>
  )
}

export default function App() {
  const [session, setSession] = useState(getSession)
  const navigate = useNavigate()

  function updateSession(value) {
    saveSession(value)
    setSession(value)
    navigate(value ? '/pos' : '/login', { replace: true })
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/pos" replace /> : <Login onLogin={updateSession} />} />
      <Route element={session ? <Layout session={session} onLogout={() => updateSession(null)} /> : <Navigate to="/login" replace />}>
        <Route path="/pos" element={<Pos />} />
        <Route path="/orders" element={<Orders isAdmin={session?.role === 'ADMIN'} />} />
        <Route path="/products" element={session?.role === 'ADMIN' ? <Products /> : <Navigate to="/pos" replace />} />
      </Route>
      <Route path="*" element={<Navigate to={session ? '/pos' : '/login'} replace />} />
    </Routes>
  )
}
