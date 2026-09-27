import { appConfig } from '@/shared/config/env'
import { ApiError } from '@/shared/api/errors'
import { getAccessToken, refreshAccessToken, forceLogin } from '@/shared/auth/token'

export type QueryValue = string | number | boolean | null | undefined

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  query?: Record<string, QueryValue>
  body?: unknown
  skipAuth?: boolean
  rawResponse?: boolean
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = appConfig.API_BASE_URL.replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${base}${normalized}`, window.location.origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.pathname + url.search
}

async function parseError(response: Response, requestId: string): Promise<ApiError> {
  try {
    const data = (await response.json()) as { message?: string; request_id?: string; code?: string }
    return new ApiError(
      data.message ?? (response.statusText || 'Ошибка запроса'),
      response.status,
      data.request_id ?? requestId,
      data.code,
    )
  } catch {
    return new ApiError(response.statusText || 'Ошибка запроса', response.status, requestId)
  }
}

type TokenGetter = () => Promise<string | null> | string | null
type OnUnauthorized = () => Promise<void> | void

let tokenGetter: TokenGetter = getAccessToken
let onUnauthorized: OnUnauthorized = forceLogin

export function configureApiClient(options: {
  getToken?: TokenGetter
  onUnauthorized?: OnUnauthorized
}) {
  if (options.getToken) tokenGetter = options.getToken
  if (options.onUnauthorized) onUnauthorized = options.onUnauthorized
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const requestId = crypto.randomUUID()
  const headers = new Headers(options.headers)
  headers.set('X-Request-ID', requestId)
  headers.set('Accept', 'application/json')

  if (!options.skipAuth) {
    let token = await tokenGetter()
    if (!token) {
      await refreshAccessToken()
      token = await tokenGetter()
    }
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    if (options.body instanceof FormData || typeof options.body === 'string') {
      body = options.body as BodyInit
    } else {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(options.body)
    }
  }

  const started = performance.now()
  const url = buildUrl(path, options.query)

  const doFetch = async () =>
    fetch(url, {
      ...options,
      headers,
      body,
    })

  let response = await doFetch()

  if (response.status === 401 && !options.skipAuth) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const newToken = await tokenGetter()
      if (newToken) headers.set('Authorization', `Bearer ${newToken}`)
      response = await doFetch()
    } else {
      await onUnauthorized()
      throw new ApiError('Сессия истекла', 401, requestId, 'unauthorized')
    }
  }

  const duration = Math.round(performance.now() - started)
  window.dispatchEvent(
    new CustomEvent('app:api-timing', {
      detail: { path, status: response.status, duration, requestId },
    }),
  )

  if (!response.ok) {
    const error = await parseError(response, requestId)
    window.dispatchEvent(
      new CustomEvent('app:api-error', {
        detail: {
          path,
          status: error.status,
          request_id: error.requestId,
          message: error.message,
        },
      }),
    )
    throw error
  }

  if (options.rawResponse) {
    return response as unknown as T
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

export async function downloadFile(
  path: string,
  query: Record<string, QueryValue>,
  fallbackName: string,
): Promise<void> {
  const response = await apiRequest<Response>(path, { query, rawResponse: true })
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  let filename = fallbackName
  if (disposition) {
    const match = /filename\*?=(?:UTF-8''|")?([^\";]+)"?/i.exec(disposition)
    if (match?.[1]) filename = decodeURIComponent(match[1])
  }
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}
