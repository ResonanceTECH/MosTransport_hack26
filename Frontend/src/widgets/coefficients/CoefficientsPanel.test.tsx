import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CoefficientsPanel } from '@/widgets/coefficients/CoefficientsPanel'
import { renderWithProviders, seedDemoSession } from '@/test/test-utils'

/** Defaults from useDashboardFilters — not flat 1.0. */
const DEFAULTS: Record<string, number> = {
  k_weather: 1.2,
  k_event: 1.15,
  k_season: 1,
  k_traffic: 1.1,
}

function sliderValue(name: string) {
  return Number(screen.getByRole('slider', { name }).getAttribute('aria-valuenow'))
}

describe('CoefficientsPanel (component)', () => {
  it('renders sliders with project defaults, min/max/step, and reset', async () => {
    seedDemoSession('dispatcher')
    const user = userEvent.setup()

    renderWithProviders(<CoefficientsPanel compact />, {
      initialEntries: ['/coefficients?route=17'],
    })

    expect(await screen.findByText('Коэффициенты модели')).toBeInTheDocument()

    for (const [key, value] of Object.entries(DEFAULTS)) {
      const slider = screen.getByRole('slider', { name: key })
      expect(slider).toHaveAttribute('aria-valuemin', '0.5')
      expect(slider).toHaveAttribute('aria-valuemax', '1.5')
      expect(sliderValue(key)).toBe(value)
    }

    const weather = screen.getByRole('slider', { name: 'k_weather' })
    weather.focus()
    await user.keyboard('{ArrowRight}')

    await waitFor(() => {
      expect(sliderValue('k_weather')).toBeCloseTo(1.25, 5)
    })

    await user.click(screen.getByRole('button', { name: 'Сбросить к значениям по умолчанию' }))

    await waitFor(() => {
      expect(sliderValue('k_weather')).toBe(DEFAULTS.k_weather)
    })
  })

  it('exposes aria-label on info icon button', async () => {
    seedDemoSession('dispatcher')
    renderWithProviders(<CoefficientsPanel compact />, {
      initialEntries: ['/coefficients?route=17'],
    })

    expect(await screen.findAllByRole('button', { name: 'Информация' })).not.toHaveLength(0)
  })
})
