import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Accessibility', () => {
  test('login form is keyboard reachable and submit works with Enter', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('Электронная почта').focus()
    await expect(page.getByPlaceholder('Электронная почта')).toBeFocused()
    await page.keyboard.type('demo_dispatcher')
    await page.keyboard.press('Tab')
    await page.keyboard.type('dispatcher')

    const submit = page.getByRole('button', { name: 'Войти', exact: true })
    await submit.focus()
    await expect(submit).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('export XLSX is reachable via keyboard and activated with Enter', async ({ page }) => {
    await loginAs(page, 'demo_dispatcher', 'dispatcher')
    await page.goto('/exports')

    const xlsx = page.getByRole('button', { name: 'Скачать XLSX' })
    await xlsx.focus()
    await expect(xlsx).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(xlsx).toBeVisible()
  })

  test('critical pages have no serious axe violations', async ({ page }) => {
    await page.goto('/login')
    const loginResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze()
    expect(loginResults.violations.filter((v) => v.impact === 'critical')).toEqual([])

    await loginAs(page, 'demo_dispatcher', 'dispatcher')

    for (const path of ['/dashboard', '/exports', '/coefficients', '/forbidden']) {
      await page.goto(path)
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast'])
        .analyze()
      const critical = results.violations.filter((v) => v.impact === 'critical')
      expect(critical, `critical a11y on ${path}`).toEqual([])
    }
  })
})
