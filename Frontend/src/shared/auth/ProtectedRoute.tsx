import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuth } from '@/shared/auth/AuthProvider'

export { RoleGuard } from '@/shared/guards/RoleGuard'

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
