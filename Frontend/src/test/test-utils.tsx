import { CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { demoLogin, type AppRole } from '@/shared/auth/token'
import { ColorModeProvider } from '@/shared/theme/ColorModeProvider'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function seedDemoSession(role: 'dispatcher' | 'admin' = 'dispatcher') {
  if (role === 'admin') {
    demoLogin('demo_admin', 'admin')
  } else {
    demoLogin('demo_dispatcher', 'dispatcher')
  }
}

interface ProvidersProps {
  children: ReactNode
  initialEntries?: string[]
  queryClient?: QueryClient
  withAuth?: boolean
}

export function TestProviders({
  children,
  initialEntries = ['/dashboard'],
  queryClient = createTestQueryClient(),
  withAuth = true,
}: ProvidersProps) {
  const tree = (
    <ColorModeProvider>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {withAuth ? <AuthProvider>{children}</AuthProvider> : children}
        </MemoryRouter>
      </QueryClientProvider>
    </ColorModeProvider>
  )
  return tree
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  queryClient?: QueryClient
  withAuth?: boolean
  role?: 'dispatcher' | 'admin'
  seedAuth?: boolean
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialEntries = ['/dashboard'],
    queryClient = createTestQueryClient(),
    withAuth = true,
    role = 'dispatcher',
    seedAuth = false,
    ...options
  }: RenderWithProvidersOptions = {},
) {
  if (seedAuth) seedDemoSession(role)

  return {
    queryClient,
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestProviders
          initialEntries={initialEntries}
          queryClient={queryClient}
          withAuth={withAuth}
        >
          {children}
        </TestProviders>
      ),
      ...options,
    }),
  }
}

export function renderAtRoute(
  ui: ReactElement,
  path: string,
  options?: RenderWithProvidersOptions,
) {
  return renderWithProviders(
    <Routes>
      <Route path="*" element={ui} />
    </Routes>,
    { ...options, initialEntries: [path] },
  )
}

export type { AppRole }
