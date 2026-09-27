import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExportButtons } from '@/widgets/export/ExportButtons'
import * as endpoints from '@/shared/api/endpoints'
import { renderWithProviders, seedDemoSession } from '@/test/test-utils'

describe('ExportButtons (component)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('triggers CSV and XLSX export actions', async () => {
    seedDemoSession('dispatcher')
    const user = userEvent.setup()
    const spy = vi.spyOn(endpoints.api, 'exportForecast').mockResolvedValue(undefined)

    renderWithProviders(<ExportButtons labels={{ csv: 'Скачать CSV', xlsx: 'Скачать XLSX' }} />, {
      initialEntries: ['/exports?route=17'],
    })

    await user.click(screen.getByRole('button', { name: 'Скачать CSV' }))
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ format: 'csv', route: '17' }))
    })

    await user.click(screen.getByRole('button', { name: 'Скачать XLSX' }))
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ format: 'xlsx', route: '17' }))
    })
  })

  it('disables buttons while export is pending', async () => {
    seedDemoSession('dispatcher')
    const user = userEvent.setup()
    let resolveExport!: () => void
    vi.spyOn(endpoints.api, 'exportForecast').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveExport = () => resolve(undefined)
        }),
    )

    renderWithProviders(<ExportButtons />, {
      initialEntries: ['/exports?route=17'],
    })

    await user.click(screen.getByRole('button', { name: 'CSV' }))

    await waitFor(() => {
      const csvButtons = screen.getAllByRole('button', { name: /CSV/ })
      expect(csvButtons.some((b) => b.hasAttribute('disabled'))).toBe(true)
      expect(screen.getByRole('button', { name: 'XLSX' })).toBeDisabled()
    })

    resolveExport()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'CSV' })).toBeEnabled()
    })
  })
})
