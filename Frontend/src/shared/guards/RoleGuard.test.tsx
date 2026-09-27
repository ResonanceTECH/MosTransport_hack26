import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute'
import { RoleGuard } from '@/shared/guards/RoleGuard'
import { renderWithProviders, seedDemoSession } from '@/test/test-utils'

function GuardHarness() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleGuard roles={['admin']} />}>
          <Route path="/admin/system" element={<div>ADMIN_OK</div>} />
        </Route>
      </Route>
      <Route path="/forbidden" element={<div>FORBIDDEN</div>} />
      <Route path="/login" element={<div>LOGIN</div>} />
      <Route path="/dashboard" element={<div>DASHBOARD</div>} />
    </Routes>
  )
}

describe('RoleGuard (component / RBAC)', () => {
  it('allows admin into /admin/system', async () => {
    seedDemoSession('admin')
    renderWithProviders(<GuardHarness />, {
      initialEntries: ['/admin/system'],
    })

    expect(await screen.findByText('ADMIN_OK')).toBeInTheDocument()
  })

  it('redirects dispatcher from /admin/system to /forbidden', async () => {
    seedDemoSession('dispatcher')
    renderWithProviders(<GuardHarness />, {
      initialEntries: ['/admin/system'],
    })

    expect(await screen.findByText('FORBIDDEN')).toBeInTheDocument()
    expect(screen.queryByText('ADMIN_OK')).not.toBeInTheDocument()
  })
})

describe('DispatcherBottomNavigation (RBAC visibility)', () => {
  it('hides Система for dispatcher and shows it for admin', async () => {
    const { DispatcherBottomNavigation } = await import(
      '@/widgets/layout/DispatcherBottomNavigation'
    )

    seedDemoSession('dispatcher')
    const { unmount } = renderWithProviders(<DispatcherBottomNavigation />, {
      initialEntries: ['/dashboard'],
    })

    expect(await screen.findByRole('navigation', { name: 'Навигация' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Главная' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Система' })).not.toBeInTheDocument()
    unmount()

    seedDemoSession('admin')
    renderWithProviders(<DispatcherBottomNavigation />, {
      initialEntries: ['/dashboard'],
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Система' })).toBeInTheDocument()
    })
  })
})
