import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { appConfig } from '@/shared/config/env'
import { initTelemetry } from '@/shared/telemetry/telemetry'

async function prepare() {
  if (appConfig.USE_MSW) {
    const { worker } = await import('@/shared/mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    })
  }
  initTelemetry()
}

void prepare().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
