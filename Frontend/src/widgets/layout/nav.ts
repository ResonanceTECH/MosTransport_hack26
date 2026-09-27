/** Single source for dispatcher/admin app navigation. */

export const DISPATCHER_NAV = [
  { label: 'Главная', path: '/dashboard' },
  { label: 'Аналитика', path: '/forecast' },
  { label: 'Сценарии', path: '/coefficients' },
  { label: 'Экспорт', path: '/exports' },
  { label: 'Модель', path: '/model' },
] as const

export const ADMIN_NAV_ITEM = {
  label: 'Система',
  path: '/admin/system',
} as const

export type NavPath =
  | (typeof DISPATCHER_NAV)[number]['path']
  | (typeof ADMIN_NAV_ITEM)['path']
