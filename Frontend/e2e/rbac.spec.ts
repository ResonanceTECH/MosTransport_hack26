import { expect, test } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('RBAC', () => {
  test('dispatcher does not see Система and is redirected from /admin/system', async ({
    page,
  }) => {
    await loginAs(page, 'demo_dispatcher', 'dispatcher')

    await expect(page.getByRole('link', { name: 'Система' })).toHaveCount(0)

    await page.goto('/admin/system')
    await expect(page).toHaveURL(/\/forbidden/)
    await expect(page.getByRole('heading', { name: 'Нет доступа' })).toBeVisible()
    await expect(page.getByText(/Код ошибки:\s*403/)).toBeVisible()
  })

  test('admin sees Система, Grafana control and recalculation', async ({ page }) => {
    await loginAs(page, 'demo_admin', 'admin')

    await expect(page.getByRole('link', { name: 'Система' })).toBeVisible()
    await page.getByRole('link', { name: 'Система' }).click()
    await expect(page).toHaveURL(/\/admin\/system/)

    await expect(page.getByRole('heading', { name: 'Пересчёт прогнозов' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Открыть Grafana' }).or(
        page.getByRole('button', { name: 'Адрес Grafana не настроен' }),
      ),
    ).toBeVisible()
  })
})
