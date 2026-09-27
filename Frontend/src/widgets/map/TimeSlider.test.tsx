import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TimeSlider } from '@/widgets/map/TimeSlider'
import { renderWithProviders, seedDemoSession } from '@/test/test-utils'

describe('TimeSlider (component / a11y)', () => {
  it('toggles play/pause via labelled icon button and updates hour', async () => {
    seedDemoSession('dispatcher')
    const user = userEvent.setup()

    renderWithProviders(<TimeSlider />, {
      initialEntries: ['/dashboard?route=17&hour=8'],
    })

    const play = await screen.findByRole('button', { name: 'Воспроизведение' })
    expect(screen.getAllByText('08:00').length).toBeGreaterThan(0)

    await user.click(play)
    expect(await screen.findByRole('button', { name: 'Пауза' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Пауза' }))
    expect(screen.getByRole('button', { name: 'Воспроизведение' })).toBeInTheDocument()

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowRight}')

    await waitFor(() => {
      expect(screen.getAllByText('09:00').length).toBeGreaterThan(0)
    })
  })
})
