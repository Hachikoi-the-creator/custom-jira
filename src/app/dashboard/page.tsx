import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, CalendarDays, Lightbulb, BarChart3, CheckSquare, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'

export default async function DashboardPage() {
  const supabase = await createClient()
  const [
    { count: clientsCount },
    { count: meetingsCount },
    { count: problemsCount },
    { count: reportsCount },
    { data: pendingItems },
    { data: recentMeetings },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('meetings').select('*', { count: 'exact', head: true }),
    supabase.from('problems').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }),
    supabase.from('action_items').select('*, client:clients(name)').eq('done', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('meetings').select('*, client:clients(name)').order('date', { ascending: false }).limit(4),
  ])

  const stats = [
    { label: 'Clients', value: clientsCount ?? 0, icon: Users, href: '/clients', color: 'bg-primary/10 text-primary' },
    { label: 'Meetings', value: meetingsCount ?? 0, icon: CalendarDays, href: '/meetings', color: 'bg-teal-50 text-teal-600' },
    { label: 'Problems', value: problemsCount ?? 0, icon: Lightbulb, href: '/problems', color: 'bg-amber-50 text-amber-600' },
    { label: 'Reports', value: reportsCount ?? 0, icon: BarChart3, href: '/reports', color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="page-title">Good morning 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy', { locale: enUS })}</p>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, href, color }) => (
            <Link key={href} href={href} className="card hover:shadow-md transition-shadow">
              <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}><Icon size={18} /></div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-muted-foreground text-sm">{label}</p>
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><CheckSquare size={16} className="text-muted-foreground" /><h2 className="font-semibold text-foreground">Open items</h2></div>
              <Link href="/meetings" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {!pendingItems?.length ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Nothing open 🎉</p>
            ) : (
              <ul className="space-y-2">
                {pendingItems.map((item: any) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <div><p className="text-foreground">{item.text}</p>{item.client && <p className="text-xs text-muted-foreground">{item.client.name}</p>}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Clock size={16} className="text-muted-foreground" /><h2 className="font-semibold text-foreground">Recent meetings</h2></div>
              <Link href="/meetings" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {!recentMeetings?.length ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No meetings yet</p>
            ) : (
              <ul className="space-y-3">
                {recentMeetings.map((m: any) => (
                  <li key={m.id}>
                    <Link href={`/meetings/${m.id}`} className="block hover:bg-muted -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                      <p className="text-sm font-medium text-foreground">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.client?.name ?? 'No client'} · {format(new Date(m.date), 'd MMM yyyy', { locale: enUS })}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
