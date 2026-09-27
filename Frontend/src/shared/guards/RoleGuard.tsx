import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/shared/auth/AuthProvider'
import type { AppRole } from '@/shared/auth/token'

/** Route-level RBAC. Hidden nav is not enough — always wrap admin routes. */
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
