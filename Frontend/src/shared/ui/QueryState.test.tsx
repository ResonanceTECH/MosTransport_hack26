import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QueryState } from '@/shared/ui/QueryState'
import { ApiError } from '@/shared/api/errors'
import { renderWithProviders } from '@/test/test-utils'

describe('QueryState (component / error states)', () => {
  it('shows empty message', () => {
    renderWithProviders(
      <QueryState isLoading={false} isError={false} error={null} isEmpty>
        <div>DATA</div>
      </QueryState>,
      { withAuth: false },
    )

    expect(screen.getByText('Для выбранных параметров нет данных')).toBeInTheDocument()
    expect(screen.queryByText('DATA')).not.toBeInTheDocument()
  })

  it('shows retry for 503', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderWithProviders(
      <QueryState
        isLoading={false}
        isError
        error={new ApiError('Service unavailable', 503, 'req-1')}
        onRetry={onRetry}
      >
        <div>DATA</div>
      </QueryState>,
      { withAuth: false },
    )

    expect(screen.getByText('Service unavailable')).toBeInTheDocument()
    expect(screen.getByText(/request_id: req-1/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
