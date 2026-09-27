import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Analytics01Icon, LinkSquare02Icon } from '@hugeicons/core-free-icons'
import {
  getGrafanaUrl,
  isGrafanaConfigured,
} from '@/features/open-grafana/grafanaUrl'
import { Icon } from '@/shared/ui/Icon'

export function AdminMonitoringCard() {
  const configured = isGrafanaConfigured()
  const url = getGrafanaUrl()

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Icon icon={Analytics01Icon} size={22} />
            <Typography variant="h6" component="h2">
              Мониторинг системы
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Метрики, логи и состояние сервисов
          </Typography>
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        {configured ? (
          <Button
            variant="contained"
            color="primary"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<Icon icon={LinkSquare02Icon} size={16} />}
            aria-label="Открыть Grafana"
          >
            Открыть Grafana
          </Button>
        ) : (
          <Button variant="contained" color="primary" disabled aria-label="Адрес Grafana не настроен">
            Адрес Grafana не настроен
          </Button>
        )}
      </CardActions>
    </Card>
  )
}
