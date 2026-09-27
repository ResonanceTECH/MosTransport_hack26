import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { ApiError, isApiError, isRetryableStatus } from '@/shared/api/errors'

export interface QueryStateProps {
  isLoading: boolean
  isError: boolean
  error: unknown
  isEmpty?: boolean
  onRetry?: () => void
  loadingHeight?: number
  children: ReactNode
}

function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Не удалось загрузить данные'
}

function requestId(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.requestId
  return undefined
}

export function QueryState({
  isLoading,
  isError,
  error,
  isEmpty = false,
  onRetry,
  loadingHeight = 120,
  children,
}: QueryStateProps) {
  if (isLoading) {
    return <Skeleton variant="rounded" height={loadingHeight} animation="wave" />
  }

  if (isError) {
    const status = isApiError(error) ? error.status : 0
    const canRetry = isRetryableStatus(status) && onRetry
    const rid = requestId(error)

    return (
      <Box
        sx={{
          py: 2,
          px: 2,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'error.light',
          bgcolor: 'rgba(227, 30, 36, 0.06)',
          color: 'text.primary',
        }}
      >
        <Typography variant="body2" fontWeight={600}>
          {errorMessage(error)}
        </Typography>
        {rid ? (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            request_id: {rid}
          </Typography>
        ) : null}
        {canRetry ? (
          <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={onRetry}>
            Повторить
          </Button>
        ) : null}
      </Box>
    )
  }

  if (isEmpty) {
    return (
      <Box py={3} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          Для выбранных параметров нет данных
        </Typography>
      </Box>
    )
  }

  return <>{children}</>
}
