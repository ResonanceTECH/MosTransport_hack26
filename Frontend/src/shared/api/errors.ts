export class ApiError extends Error {
  readonly status: number
  readonly requestId: string
  readonly code?: string

  constructor(message: string, status: number, requestId: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
    this.code = code
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isRetryableStatus(status: number): boolean {
  return status === 503 || status === 504 || status === 502
}
