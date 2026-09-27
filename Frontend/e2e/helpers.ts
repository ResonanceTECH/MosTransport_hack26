import { expect, type Page } from '@playwright/test'

export async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.getByPlaceholder('Электронная почта').fill(username)
  await page.getByPlaceholder('Пароль').fill(password)
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}
