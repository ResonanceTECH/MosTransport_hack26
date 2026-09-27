import Box from '@mui/material/Box'
import { PageHeader } from '@/widgets/layout/PageHeader'
import { CoefficientsPanel } from '@/widgets/coefficients/CoefficientsPanel'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { KpiBar } from '@/widgets/kpi/KpiBar'

export function CoefficientsPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 960, p: { xs: 1.5, md: 2 } }}>
      <PageHeader
        title="Корректирующие коэффициенты"
        subtitle="Сценарии внешних факторов с live-пересчётом прогноза"
      />

      <ErrorBoundary title="KPI">
        <KpiBar />
      </ErrorBoundary>

      <ErrorBoundary title="Коэффициенты">
        <CoefficientsPanel enableScenarios />
      </ErrorBoundary>
    </Box>
  )
}
