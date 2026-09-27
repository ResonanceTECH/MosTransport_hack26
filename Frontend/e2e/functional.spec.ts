import { expect, test } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('Functional + E2E (mock API)', () => {
  test('login → navigate main sections → horizon → coefficients → export', async ({ page }) => {
    await loginAs(page, 'demo_dispatcher', 'dispatcher')

    await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Главная' })).toBeVisible()

    await page.getByRole('link', { name: 'Аналитика' }).click()
    await expect(page).toHaveURL(/\/forecast/)

    await page.getByRole('link', { name: 'Сценарии' }).click()
    await expect(page).toHaveURL(/\/coefficients/)
    await expect(page.getByText('Коэффициенты модели')).toBeVisible()

    const weather = page.getByRole('slider', { name: 'k_weather' })
    await expect(weather).toBeVisible()
    await weather.focus()
    await page.keyboard.press('ArrowRight')
    await page.getByRole('button', { name: 'Сбросить к значениям по умолчанию' }).click()

    await page.getByRole('link', { name: 'Экспорт' }).click()
    await expect(page).toHaveURL(/\/exports/)
    await expect(page.getByRole('button', { name: /CSV/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /XLSX/i })).toBeVisible()

    await page.getByRole('link', { name: 'Модель' }).click()
    await expect(page).toHaveURL(/\/model/)

    await page.getByRole('link', { name: 'Главная' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    const monthBtn = page.locator('main').getByRole('button', { name: 'Месяц' }).first()
    const dayBtn = page.locator('main').getByRole('button', { name: 'День' }).first()
    await monthBtn.click()
    await expect(page).toHaveURL(/horizon=month/)
    await dayBtn.click()
    await expect(page).toHaveURL(/horizon=day/)
  })

  test('404 home CTA works', async ({ page }) => {
    await loginAs(page, 'demo_dispatcher', 'dispatcher')
    await page.goto('/this-page-does-not-exist')
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await page.getByRole('button', { name: 'Вернуться на главную' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('time slider play/pause is labelled and focusable', async ({ page }) => {
    await loginAs(page, 'demo_dispatcher', 'dispatcher')
    const play = page.getByRole('button', { name: 'Воспроизведение' })
    await expect(play).toBeVisible()
    await play.focus()
    await expect(play).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Воспроизведение' })).toBeVisible()
  })
})
