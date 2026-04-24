import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: meetings } = await supabase.from('meetings').select('*, client:clients(name, company)').order('date', { ascending: false })
  return (
    <AppLayout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="page-title">Reuniones</h1><p className="text-muted-foreground text-sm mt-1">{meetings?.length ?? 0} reuniones</p></div>
          <Link href="/meetings/new" className="btn-primary flex items-center gap-2"><Plus size={16} />Nueva reunión</Link>
        </div>
        {!meetings?.length ? (
          <div className="card text-center py-16">
            <CalendarDays size={40} className="text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Sin reuniones</p>
            <Link href="/meetings/new" className="btn-primary inline-flex items-center gap-2 mt-4"><Plus size={16} />Nueva reunión</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((m: any) => (
              <Link key={m.id} href={`/meetings/${m.id}`} className="card hover:shadow-md transition-all hover:border-primary/30 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0"><CalendarDays size={18} className="text-teal-600" /></div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{m.title}</p>
                    <p className="text-sm text-muted-foreground">{m.client?.name ?? 'Sin cliente'}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{format(new Date(m.date), 'd MMM yyyy', { locale: es })}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
