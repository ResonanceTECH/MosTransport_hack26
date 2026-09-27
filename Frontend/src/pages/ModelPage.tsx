import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/endpoints'
import { PageHeader } from '@/widgets/layout/PageHeader'
import { QueryState } from '@/shared/ui/QueryState'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'

export function ModelPage() {
  const modelQuery = useQuery({
    queryKey: ['model-info'],
    queryFn: () => api.getModelInfo(),
  })

  const factorsQuery = useQuery({
    queryKey: ['factors'],
    queryFn: () => api.getFactors(),
  })

  const model = modelQuery.data
  const sources = factorsQuery.data?.sources ?? []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 960, p: { xs: 1.5, md: 2 } }}>
      <PageHeader
        title="О модели"
        subtitle="Версия, качество, область применимости и внешние источники"
      />
      <Box id="docs" />

      <ErrorBoundary title="О модели">
        <Stack spacing={2}>
          <QueryState
            isLoading={modelQuery.isLoading}
            isError={modelQuery.isError}
            error={modelQuery.error}
            onRetry={() => void modelQuery.refetch()}
            loadingHeight={220}
          >
            {model ? (
              <Paper sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h5">{model.name}</Typography>
                    <Typography color="text.secondary">Версия {model.version}</Typography>
                  </Box>
                  <Typography>
                    Дата обучения:{' '}
                    <strong>{new Date(model.trained_at).toLocaleString('ru-RU')}</strong>
                  </Typography>
                  <Typography>
                    WAPE: <strong>{(model.wape * 100).toFixed(1)}%</strong>
                  </Typography>
                  {model.wape_by_horizon ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {Object.entries(model.wape_by_horizon).map(([h, v]) => (
                        <Chip
                          key={h}
                          label={`WAPE ${h}: ${(v * 100).toFixed(1)}%`}
                          color="info"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  ) : null}
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Область применения
                    </Typography>
                    <Typography color="text.secondary">{model.scope}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Ограничения
                    </Typography>
                    <List dense>
                      {model.limitations.map((item) => (
                        <ListItem key={item} disableGutters>
                          <ListItemText primary={`• ${item}`} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Stack>
              </Paper>
            ) : null}
          </QueryState>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Внешние источники данных
            </Typography>
            <QueryState
              isLoading={factorsQuery.isLoading}
              isError={factorsQuery.isError}
              error={factorsQuery.error}
              isEmpty={sources.length === 0}
              onRetry={() => void factorsQuery.refetch()}
            >
              <List>
                {sources.map((source) => (
                  <ListItem key={`${source.name}-${source.url}`} disableGutters alignItems="flex-start">
                    <ListItemText
                      primary={
                        source.url ? (
                          <Link href={source.url} target="_blank" rel="noopener noreferrer">
                            {source.name}
                          </Link>
                        ) : (
                          source.name
                        )
                      }
                      secondary={
                        <Stack spacing={0.5} component="span" sx={{ mt: 0.5 }}>
                          {source.description ? (
                            <Typography variant="body2" color="text.secondary" component="span">
                              {source.description}
                            </Typography>
                          ) : null}
                          <Stack direction="row" spacing={1} component="span">
                            <Chip size="small" label="внешний источник" variant="outlined" />
                          </Stack>
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </QueryState>
          </Paper>

          <Alert severity="info">
            Frontend не считает ML-прогноз самостоятельно — только визуализирует ответ backend.
          </Alert>
        </Stack>
      </ErrorBoundary>
    </Box>
  )
}
