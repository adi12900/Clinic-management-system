import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks'
import AppLayout from './AppLayout'

const roleHome = { patient: '/patient/dashboard', doctor: '/doctor/dashboard', admin: '/admin/dashboard' }

export function ProtectedRoute({ children, allowedRole }) {
  const { isLoggedIn, role } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (allowedRole && role !== allowedRole) return <Navigate to={roleHome[role] || '/login'} replace />
  return <AppLayout>{children}</AppLayout>
}

export function GuestRoute({ children }) {
  const { isLoggedIn, role } = useAuth()
  if (isLoggedIn && role) return <Navigate to={roleHome[role]} replace />
  return children
}
