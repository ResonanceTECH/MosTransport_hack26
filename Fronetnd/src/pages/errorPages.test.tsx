import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { renderWithProviders } from '@/test/test-utils'

describe('NotFound / Forbidden (functional)', () => {
  it('404: Вернуться на главную navigates to dashboard', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/missing" element={<NotFoundPage />} />
        <Route path="/dashboard" element={<div>DASHBOARD_HOME</div>} />
      </Routes>,
      { initialEntries: ['/missing'], withAuth: false },
    )

    expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Вернуться на главную' }))
    expect(await screen.findByText('DASHBOARD_HOME')).toBeInTheDocument()
  })

  it('403: shows code and home CTA', async () => {
    renderWithProviders(<ForbiddenPage />, {
      initialEntries: ['/forbidden'],
      withAuth: false,
    })

    expect(await screen.findByRole('heading', { name: 'Нет доступа' })).toBeInTheDocument()
    expect(screen.getByText(/Код ошибки:\s*403/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Вернуться на главную' })).toBeInTheDocument()
  })
})
