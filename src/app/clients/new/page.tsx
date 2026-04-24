'use client'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', notes: '', tags: '' })
  function set(field: string, value: string) { setForm(prev => ({ ...prev, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const { data, error } = await supabase.from('clients').insert({
      name: form.name, company: form.company || null, email: form.email || null,
      phone: form.phone || null, notes: form.notes || null, tags: tags.length ? tags : null,
    }).select().single()
    if (!error && data) router.push(`/clients/${data.id}`)
    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/clients" className="btn-secondary flex items-center gap-2"><ArrowLeft size={16} />Volver</Link>
          <h1 className="page-title">Nuevo cliente</h1>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Nombre *</label><input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre del contacto" /></div>
            <div><label className="label">Empresa</label><input className="input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Empresa" /></div>
            <div><label className="label">Correo</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@empresa.com" /></div>
            <div><label className="label">Teléfono</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+52 55 0000 0000" /></div>
            <div><label className="label">Tags (separados por coma)</label><input className="input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="BMW, GWM" /></div>
            <div className="col-span-2"><label className="label">Notas</label><textarea className="input min-h-[100px] resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Información relevante..." /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border/60">
            <Link href="/clients" className="btn-secondary">Cancelar</Link>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Crear cliente'}</button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
