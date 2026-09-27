import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from '@/components/auth/LoginForm'
import { renderWithProviders } from '@/test/test-utils'

describe('LoginForm (component)', () => {
  it('shows validation errors when fields are empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderWithProviders(<LoginForm onSubmit={onSubmit} onSsoLogin={vi.fn()} />, {
      withAuth: false,
    })

    await user.click(screen.getByRole('button', { name: 'Войти', exact: true }))

    expect(await screen.findByText('Введите логин или email')).toBeInTheDocument()
    expect(screen.getByText('Введите пароль')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits username and password', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderWithProviders(<LoginForm onSubmit={onSubmit} onSsoLogin={vi.fn()} />, {
      withAuth: false,
    })

    await user.type(screen.getByPlaceholderText('Электронная почта'), 'demo_dispatcher')
    await user.type(screen.getByPlaceholderText('Пароль'), 'dispatcher')
    await user.click(screen.getByRole('button', { name: 'Войти', exact: true }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'demo_dispatcher',
        password: 'dispatcher',
        rememberMe: false,
      })
    })
  })

  it('toggles password visibility via aria-labelled icon button', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSubmit={vi.fn()} onSsoLogin={vi.fn()} />, {
      withAuth: false,
    })

    const password = screen.getByPlaceholderText('Пароль')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Показать пароль' }))
    expect(password).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Скрыть пароль' }))
    expect(password).toHaveAttribute('type', 'password')
  })
})
