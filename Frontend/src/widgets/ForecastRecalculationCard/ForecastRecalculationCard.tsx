import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ReloadIcon } from '@hugeicons/core-free-icons'
import { useState } from 'react'
import { useRecalculateForecast } from '@/features/recalculate-forecast/useRecalculateForecast'
import { isApiError } from '@/shared/api/errors'
import { Icon } from '@/shared/ui/Icon'

export function ForecastRecalculationCard() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    severity: 'success' | 'error'
    message: string
    requestId?: string
  }>({ open: false, severity: 'success', message: '' })

  const mutation = useRecalculateForecast()
  const loading = mutation.isPending

  const handleConfirm = () => {
    setConfirmOpen(false)
    mutation.mutate(undefined, {
      onSuccess: () => {
        setSnackbar({
          open: true,
          severity: 'success',
          message: 'Пересчёт прогнозов запущен',
        })
      },
      onError: (error) => {
        setSnackbar({
          open: true,
          severity: 'error',
          message: isApiError(error)
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Не удалось запустить пересчёт',
          requestId: isApiError(error) ? error.requestId : undefined,
        })
      },
    })
  }

  return (
    <>
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
              <Icon icon={ReloadIcon} size={22} />
              <Typography variant="h6" component="h2">
                Пересчёт прогнозов
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Запустите повторный расчёт прогнозных данных после обновления исходных данных
              или внешних факторов.
            </Typography>
          </Stack>
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
          <Button
            variant="contained"
            color="primary"
            disabled={loading}
            onClick={() => setConfirmOpen(true)}
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Icon icon={ReloadIcon} size={16} />
              )
            }
          >
            {loading ? 'Запуск пересчёта...' : 'Запустить пересчёт'}
          </Button>
        </CardActions>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => !loading && setConfirmOpen(false)}
        aria-labelledby="recompute-dialog-title"
      >
        <DialogTitle id="recompute-dialog-title">Запустить пересчёт прогнозов?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Будет запущен повторный расчёт прогнозных данных. Операция может занять некоторое
            время.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={loading}>
            Отмена
          </Button>
          <Button variant="contained" color="primary" onClick={handleConfirm} disabled={loading}>
            Запустить
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          <Typography variant="body2">{snackbar.message}</Typography>
          {snackbar.requestId ? (
            <Typography variant="caption" display="block" sx={{ opacity: 0.85, mt: 0.25 }}>
              request_id: {snackbar.requestId}
            </Typography>
          ) : null}
        </Alert>
      </Snackbar>
    </>
  )
}
