import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Tag, Building2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: problem } = await supabase.from('problems').select('*, client:clients(id, name)').eq('id', id).single()
  if (!problem) notFound()
  return (
    <AppLayout>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-8"><Link href="/problems" className="btn-secondary flex items-center gap-2"><ArrowLeft size={16} />Problemas</Link></div>
        <div className="space-y-5">
          <div className="card">
            <div className="flex items-start justify-between">
              <h1 className="text-xl font-bold text-[#0f1f3d] flex-1">{problem.title}</h1>
              <Link href={`/problems/${problem.id}/edit`} className="btn-secondary text-xs ml-4">Editar</Link>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
              {problem.client && <Link href={`/clients/${problem.client.id}`} className="flex items-center gap-1 hover:text-blue-600"><Building2 size={13} />{problem.client.name}</Link>}
              <span className="flex items-center gap-1"><Calendar size={13} />{format(new Date(problem.created_at), 'd MMM yyyy', { locale: es })}</span>
            </div>
            {problem.tags?.length > 0 && <div className="flex gap-1.5 mt-3 flex-wrap">{problem.tags.map((tag: string) => <span key={tag} className="badge bg-amber-50 text-amber-600"><Tag size={10} className="mr-1" />{tag}</span>)}</div>}
          </div>
          <div className="card"><h2 className="section-title mb-3">Descripción del problema</h2><p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{problem.description}</p></div>
          <div className="card border-teal-200 bg-teal-50/30"><h2 className="section-title text-teal-700 mb-3">✓ Solución aplicada</h2><p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{problem.solution}</p></div>
        </div>
      </div>
    </AppLayout>
  )
}
