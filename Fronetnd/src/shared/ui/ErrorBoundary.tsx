import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportBoundaryError } from '@/shared/telemetry/telemetry'

interface ErrorBoundaryProps {
  children: ReactNode
  title?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportBoundaryError(error, info.componentStack ?? undefined)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const { children, title = 'Ошибка интерфейса' } = this.props

    if (error) {
      return (
        <Box p={2}>
          <Alert severity="error" sx={{ alignItems: 'flex-start' }}>
            <Typography variant="subtitle2">{title}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {error.message}
            </Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={this.handleReset}>
              Попробовать снова
            </Button>
          </Alert>
        </Box>
      )
    }

    return children
  }
}
