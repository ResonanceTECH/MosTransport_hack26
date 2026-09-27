import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline } from '@mui/material'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { ProtectedRoute, RoleGuard } from '@/shared/auth/ProtectedRoute'
import { ColorModeProvider } from '@/shared/theme/ColorModeProvider'
import { LoginPage } from '@/pages/LoginPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ForecastPage } from '@/pages/ForecastPage'
import { CoefficientsPage } from '@/pages/CoefficientsPage'
import { ExportsPage } from '@/pages/ExportsPage'
import { ModelPage } from '@/pages/ModelPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { AppLayout } from '@/widgets/layout/AppLayout'
import { ApiErrorRedirect } from '@/shared/api/ApiErrorRedirect'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <ColorModeProvider>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <ApiErrorRedirect />
            <ErrorBoundary title="Приложение">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/forbidden" element={<ForbiddenPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<RoleGuard roles={['dispatcher', 'admin']} />}>
                    <Route element={<AppLayout />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/forecast" element={<ForecastPage />} />
                      <Route path="/coefficients" element={<CoefficientsPage />} />
                      <Route path="/exports" element={<ExportsPage />} />
                      <Route path="/model" element={<ModelPage />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ColorModeProvider>
  )
}
