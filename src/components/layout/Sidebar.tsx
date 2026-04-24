'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeSwitcher from '@/components/theme-switcher'
import { LayoutDashboard, Users, CalendarDays, Lightbulb, BarChart3, LayoutList, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/meetings', label: 'Reuniones', icon: CalendarDays },
  { href: '/tasks', label: 'Tareas', icon: LayoutList },
  { href: '/problems', label: 'Problemas', icon: Lightbulb },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col fixed left-0 top-0 border-r border-sidebar-border">
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-sm">D</span>
          </div>
          <div>
            <p className="text-sidebar-foreground font-semibold text-sm leading-none">Workspace</p>
            <p className="text-sidebar-foreground/40 text-xs mt-0.5">Dorstep</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground/90'
            )}>
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
      <ThemeSwitcher />
      <div className="px-3 pb-5">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors w-full">
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
