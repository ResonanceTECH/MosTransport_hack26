import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuth } from '@/shared/auth/AuthProvider'
import type { AppRole } from '@/shared/auth/token'

export function ProtectedRoute() {
  const { ready, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function RoleGuard({ roles }: { roles: AppRole[] }) {
  const { hasRole } = useAuth()
  if (!roles.some((role) => hasRole(role))) {
    return (
      <Navigate
        to="/forbidden"
        replace
        state={{ requiredRole: roles.includes('admin') ? 'admin' : roles[0] }}
      />
    )
  }
  return <Outlet />
}
