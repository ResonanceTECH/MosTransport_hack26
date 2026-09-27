type TelemetryPayload = Record<string, unknown>

interface TelemetryEvent {
  type: string
  ts: string
  payload?: TelemetryPayload
}

const queue: TelemetryEvent[] = []
const MAX_QUEUE = 100
let timer: number | null = null
let started = false

function push(type: string, payload?: TelemetryPayload) {
  queue.push({ type, ts: new Date().toISOString(), payload })
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE)
}

async function flush() {
  if (queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  try {
    const { api } = await import('@/shared/api/endpoints')
    await api.postTelemetry(batch)
  } catch {
    queue.unshift(...batch.slice(0, 20))
  }
}

function flushBeacon() {
  if (queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' })
  navigator.sendBeacon('/api/v1/telemetry', blob)
}

export function trackAction(type: string, payload?: TelemetryPayload) {
  push(type, payload)
}

export function initTelemetry() {
  if (started) return
  started = true

  window.onerror = (message, source, lineno, colno) => {
    push('js_error', { message: String(message), source, lineno, colno })
  }
  window.addEventListener('unhandledrejection', (event) => {
    push('unhandledrejection', { reason: String(event.reason) })
  })
  window.addEventListener('app:api-error', ((event: CustomEvent) => {
    push('api_error', event.detail as TelemetryPayload)
  }) as EventListener)
  window.addEventListener('app:api-timing', ((event: CustomEvent) => {
    push('api_performance', event.detail as TelemetryPayload)
  }) as EventListener)

  void import('web-vitals').then(({ onLCP, onINP, onCLS }) => {
    onLCP((metric) => push('web_vital', { name: 'LCP', value: metric.value }))
    onINP((metric) => push('web_vital', { name: 'INP', value: metric.value }))
    onCLS((metric) => push('web_vital', { name: 'CLS', value: metric.value }))
  })

  timer = window.setInterval(() => {
    void flush()
  }, 10_000)

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBeacon()
  })
  window.addEventListener('pagehide', flushBeacon)
}

export function reportBoundaryError(error: Error, info?: string) {
  push('react_error_boundary', { message: error.message, info })
}

export function stopTelemetry() {
  if (timer) window.clearInterval(timer)
  started = false
}
