export const THEME_STORAGE_KEY = 'dorstep-theme'

export const APP_THEMES = ['cake', 'dark', 'neon'] as const

export type AppTheme = (typeof APP_THEMES)[number]

export function isAppTheme(value: string | null | undefined): value is AppTheme {
  return value === 'cake' || value === 'dark' || value === 'neon'
}

export const DEFAULT_THEME: AppTheme = 'cake'
