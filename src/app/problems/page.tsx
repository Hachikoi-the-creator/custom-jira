'use client'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Lightbulb, Search, Tag, ChevronRight } from 'lucide-react'

export default function ProblemsPage() {
  const supabase = createClient()
  const [problems, setProblems] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    supabase.from('problems').select('*, client:clients(name)').order('created_at', { ascending: false })
      .then(({ data }) => { setProblems(data ?? []); setLoading(false) })
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearching(false); return }
    setSearching(true)
    const { data } = await supabase.from('problems').select('*, client:clients(name)').or(`title.ilike.%${q}%,description.ilike.%${q}%,solution.ilike.%${q}%`).limit(6)
    setResults(data ?? [])
    setSearching(false)
  }, [])

  useEffect(() => { const t = setTimeout(() => search(query), 300); return () => clearTimeout(t) }, [query, search])

  return (
    <AppLayout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="page-title">Base de problemas</h1><p className="text-muted-foreground text-sm mt-1">{problems.length} problemas — busca para encontrar soluciones pasadas</p></div>
          <Link href="/problems/new" className="btn-primary flex items-center gap-2"><Plus size={16} />Registrar problema</Link>
        </div>
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="input pl-9" placeholder="Escribe un problema para ver soluciones similares..." value={query} onChange={e => setQuery(e.target.value)} />
          {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Buscando...</span>}
        </div>
        {query.trim() && (
          <div className="mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-3">{results.length} resultado{results.length !== 1 ? 's' : ''} para "{query}"</p>
            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map((p: any) => (
                  <Link key={p.id} href={`/problems/${p.id}`} className="card block hover:border-amber-300 hover:shadow-md transition-all">
                    <p className="font-semibold text-foreground">{p.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{p.description}</p>
                    <div className="mt-2 p-2.5 bg-teal-50 border border-teal-100 rounded-lg">
                      <p className="text-xs font-semibold text-teal-700 mb-1">✓ Solución</p>
                      <p className="text-sm text-teal-800 line-clamp-2">{p.solution}</p>
                    </div>
                    {p.client && <p className="text-xs text-muted-foreground mt-2">{p.client.name}</p>}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card text-center py-8">
                <p className="text-muted-foreground text-sm">No se encontraron problemas similares</p>
                <Link href="/problems/new" className="btn-primary inline-flex items-center gap-2 mt-3 text-sm"><Plus size={14} />Registrar este problema</Link>
              </div>
            )}
          </div>
        )}
        {!query.trim() && (
          loading ? <div className="text-muted-foreground text-sm p-4">Cargando...</div>
          : !problems.length ? (
            <div className="card text-center py-16">
              <Lightbulb size={40} className="text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Sin problemas registrados</p>
              <Link href="/problems/new" className="btn-primary inline-flex items-center gap-2 mt-4"><Plus size={16} />Registrar problema</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {problems.map((p: any) => (
                <Link key={p.id} href={`/problems/${p.id}`} className="card hover:shadow-md transition-all hover:border-amber-200 flex items-center justify-between group">
                  <div className="flex items-start gap-3 flex-1">
                    <Lightbulb size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground group-hover:text-amber-700">{p.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {p.client && <span className="text-xs text-muted-foreground">{p.client.name}</span>}
                        {p.tags?.map((tag: string) => <span key={tag} className="badge bg-amber-50 text-amber-600"><Tag size={9} className="mr-1" />{tag}</span>)}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 ml-3" />
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </AppLayout>
  )
}
