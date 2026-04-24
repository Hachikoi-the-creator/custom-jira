'use client'

import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

const labels: Record<string, string> = {
  cake: 'Cake',
  dark: 'Dark',
  neon: 'Neon',
}

type ThemeSwitcherProps = {
  variant?: 'sidebar' | 'surface'
}

export default function ThemeSwitcher({ variant = 'sidebar' }: ThemeSwitcherProps) {
  const { theme, setTheme, themes } = useTheme()
  const surface = variant === 'surface'

  return (
    <div className={surface ? 'w-full max-w-sm mx-auto pt-6' : 'px-3 pb-3'}>
      <p
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wider mb-2 px-1',
          surface ? 'text-muted-foreground' : 'text-sidebar-foreground/40',
        )}
      >
        Theme
      </p>
      <div
        className={cn(
          'flex rounded-lg p-0.5 border',
          surface ? 'bg-muted/50 border-border' : 'bg-sidebar-foreground/5 border-sidebar-border',
        )}
      >
        {themes.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={cn(
              'flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors',
              surface
                ? theme === t
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                : theme === t
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                  : 'text-sidebar-foreground/55 hover:text-sidebar-foreground/90',
            )}
          >
            {labels[t]}
          </button>
        ))}
      </div>
    </div>
  )
}
