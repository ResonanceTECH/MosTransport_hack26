import Box from '@mui/material/Box'
import { PageHeader } from '@/widgets/layout/PageHeader'
import { AdminMonitoringCard } from '@/widgets/AdminMonitoringCard/AdminMonitoringCard'
import { ForecastRecalculationCard } from '@/widgets/ForecastRecalculationCard/ForecastRecalculationCard'

export function AdminSystemPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: { xs: 1.5, md: 2 },
        maxWidth: 1100,
        width: '100%',
        mx: 'auto',
      }}
    >
      <PageHeader
        title="Система"
        subtitle="Мониторинг сервисов и управление расчётом прогнозов"
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, minmax(0, 1fr))',
          },
          alignItems: 'stretch',
        }}
      >
        <AdminMonitoringCard />
        <ForecastRecalculationCard />
      </Box>
    </Box>
  )
}
