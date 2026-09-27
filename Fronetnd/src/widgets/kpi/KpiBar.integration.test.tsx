import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { FiltersPanel } from '@/widgets/filters/FiltersPanel'
import { KpiBar } from '@/widgets/kpi/KpiBar'
import { server } from '@/test/mswServer'
import { renderWithProviders, seedDemoSession } from '@/test/test-utils'

describe('Frontend integration (Filters → MSW → KPI)', () => {
  it('loads routes from mock API and updates KPI after horizon change', async () => {
    seedDemoSession('dispatcher')
    const user = userEvent.setup()
    let lastHorizon: string | null = null

    server.use(
      http.get('/api/v1/forecast/kpi', ({ request }) => {
        const url = new URL(request.url)
        lastHorizon = url.searchParams.get('horizon')
        const month = lastHorizon === 'month'
        return HttpResponse.json({
          total_passengers: month ? 12500 : 8400,
          peak_hour: 8,
          peak_hour_load: month ? 980 : 640,
          busiest_stop: { id: 's1', name: month ? 'Остановка Месяц' : 'Остановка День', load: 320 },
          delta_vs_baseline_percent: month ? 9 : 3,
          meta: {
            request_id: 'kpi-test',
            estimated: false,
            external_data_stale: false,
          },
          effect: { delta_percent: month ? 9 : 3, delta_passengers: 40 },
        })
      }),
    )

    renderWithProviders(
      <>
        <FiltersPanel />
        <KpiBar />
      </>,
      { initialEntries: ['/dashboard?route=17&horizon=day'] },
    )

    expect(await screen.findByText(/№\s*17/)).toBeInTheDocument()
    expect(await screen.findByText('Остановка День')).toBeInTheDocument()

    await waitFor(() => {
      expect(lastHorizon).toBe('day')
    })

    await user.click(screen.getByRole('button', { name: 'Месяц' }))

    await waitFor(() => {
      expect(lastHorizon).toBe('month')
    })

    expect(await screen.findByText('Остановка Месяц')).toBeInTheDocument()
    expect(screen.getByText(/12[\s\u00a0\u202f]?500/)).toBeInTheDocument()
  })
})
