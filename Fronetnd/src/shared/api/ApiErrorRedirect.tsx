import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/** Listen for API 403 and redirect to /forbidden without mounting admin UI. */
export function ApiErrorRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    const onError = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: number }>).detail
      if (detail?.status === 403) {
        navigate('/forbidden', { replace: true })
      }
    }
    window.addEventListener('app:api-error', onError)
    return () => window.removeEventListener('app:api-error', onError)
  }, [navigate])

  return null
}
