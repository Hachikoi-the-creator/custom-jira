'use client'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, BarChart3, Copy, Check, Trash2, Share2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function buildReport(csvText: string, title: string, period: string): string {
  // ── CSV PARSE ──────────────────────────────────────────────────────────────
  function splitLine(line: string): string[] {
    const vals: string[] = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
      else cur += ch
    }
    vals.push(cur.trim())
    return vals.map(v => v.replace(/^"|"$/g, '').trim())
  }

  const rawLines: string[] = []
  let buf = '', inQuote = false
  for (const ch of csvText.trim()) {
    if (ch === '"') inQuote = !inQuote
    else if (ch === '\n' && !inQuote) { rawLines.push(buf.replace(/\r$/, '')); buf = ''; continue }
    buf += ch
  }
  if (buf) rawLines.push(buf.replace(/\r$/, ''))

  const headers = splitLine(rawLines[0])
  const rows = rawLines.slice(1).map(line => {
    const vals = splitLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  }).filter(r => r['Summary'])

  // ── AUTO-CLASSIFY TIPO DE ERROR ────────────────────────────────────────────
  const TIPO_PATTERNS: [string, RegExp][] = [
    ['Error en Citas',   /cita|appointment|agenda|schedul/i],
    ['WhatsApp',         /whatsapp|wha[ts]/i],
    ['Campaña',          /campa[ñn]/i],
    ['Leads/CRM',        /lead|crm/i],
    ['Entrenamiento IA', /\bia\b|entrenamiento|training|modelo|bot\b/i],
    ['Reset',            /reset|reinici|restart/i],
    ['Llamadas',         /llamada|call|tel[eé]fono/i],
    ['Comportamiento',   /comportamiento|conduct|behavior/i],
    ['Información',      /informa|dato/i],
  ]
  const tipoColKey = headers.find(h => /tipo/i.test(h))
  function getTipo(row: Record<string, string>): string {
    if (tipoColKey) { const v = row[tipoColKey]?.trim(); if (v) return v }
    const text = (row['Summary'] || '') + ' ' + (row['Description'] || '')
    for (const [tipo, re] of TIPO_PATTERNS) if (re.test(text)) return tipo
    return 'Otro'
  }
  rows.forEach(r => { r['_tipo'] = getTipo(r) })

  // ── STATISTICS ─────────────────────────────────────────────────────────────
  const total = rows.length
  const done = rows.filter(r => r['Status'] === 'Done').length
  const cancelled = rows.filter(r => /cancel/i.test(r['Status'])).length
  const open = rows.filter(r => !/(done|cancel)/i.test(r['Status'])).length
  const resolutionRate = total ? Math.round((done / total) * 100) : 0

  const tipoCounts: Record<string, number> = {}
  rows.forEach(r => { tipoCounts[r['_tipo']] = (tipoCounts[r['_tipo']] ?? 0) + 1 })
  const tipoEntries = Object.entries(tipoCounts).sort((a, b) => b[1] - a[1])
  const mostFreqError = tipoEntries[0]?.[0] ?? 'N/A'

  const agField = headers.find(h => /agencia/i.test(h)) ?? 'Custom field (Agencia que reporta)'
  const agencias: Record<string, number> = {}
  rows.forEach(r => { const ag = r[agField]?.trim() || 'Sin agencia'; agencias[ag] = (agencias[ag] ?? 0) + 1 })
  const topAgencies = Object.entries(agencias).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const topAgency = topAgencies[0]?.[0] ?? 'N/A'
  const activeAgencies = Object.keys(agencias).length

  const statusCounts: Record<string, number> = {}
  rows.forEach(r => { statusCounts[r['Status']] = (statusCounts[r['Status']] ?? 0) + 1 })
  const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])

  const urgField = headers.find(h => /urgencia|priority|prioridad/i.test(h)) ?? 'Priority'
  const urgCounts: Record<string, number> = {}
  rows.forEach(r => { const u = r[urgField]?.trim() || 'Sin definir'; urgCounts[u] = (urgCounts[u] ?? 0) + 1 })

  const createdField = headers.find(h => /created|fecha/i.test(h)) ?? 'Created'
  const hourCounts: number[] = new Array(24).fill(0)
  rows.forEach(r => { const d = new Date(r[createdField]); if (!isNaN(d.getTime())) hourCounts[d.getHours()]++ })
  const maxHour = Math.max(...hourCounts)
  const peakHour = hourCounts.indexOf(maxHour)

  const top5Tipos = tipoEntries.slice(0, 5).map(e => e[0])
  const top8Agencies = topAgencies.slice(0, 8).map(e => e[0])
  const agTipoMatrix: Record<string, Record<string, number>> = {}
  top8Agencies.forEach(ag => { agTipoMatrix[ag] = {}; top5Tipos.forEach(t => { agTipoMatrix[ag][t] = 0 }) })
  rows.forEach(r => {
    const ag = r[agField]?.trim() || 'Sin agencia'
    const tipo = r['_tipo']
    if (top8Agencies.includes(ag) && top5Tipos.includes(tipo)) agTipoMatrix[ag][tipo]++
  })

  // ── COLOR MAPS ─────────────────────────────────────────────────────────────
  const TIPO_COLORS: Record<string, string> = {
    'Error en Citas': '#ef4444', 'Entrenamiento IA': '#3b82f6', 'WhatsApp': '#f59e0b',
    'Campaña': '#10b981', 'Leads/CRM': '#14b8a6', 'Información': '#a855f7',
    'Reset': '#6366f1', 'Llamadas': '#f97316', 'Comportamiento': '#ec4899', 'Otro': '#94a3b8',
  }
  const URG_COLORS: Record<string, string> = {
    'Critico': '#ef4444', 'Crítico': '#ef4444', 'Critical': '#ef4444',
    'Alta': '#f97316', 'High': '#f97316',
    'Media': '#eab308', 'Medium': '#eab308',
    'Baja': '#22c55e', 'Low': '#22c55e',
  }
  const tc = (t: string) => TIPO_COLORS[t] || '#94a3b8'
  const uc = (u: string) => URG_COLORS[u] || '#94a3b8'

  // ── KPI CARDS ──────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Total tickets',       value: String(total),              sub: 'Período completo',                   color: '#1a56db', small: false },
    { label: 'Tasa de resolución',  value: `${resolutionRate}%`,       sub: `${done} tickets cerrados`,           color: '#10b981', small: false },
    { label: 'Error más frecuente', value: mostFreqError,              sub: `${tipoEntries[0]?.[1] ?? 0} tickets`, color: '#f59e0b', small: true  },
    { label: 'Top agencia',         value: topAgency,                  sub: `${topAgencies[0]?.[1] ?? 0} tickets`, color: '#ef4444', small: true  },
    { label: 'Tickets abiertos',    value: String(open),               sub: 'Sin resolver',                       color: '#f97316', small: false },
    { label: 'Cancelados',          value: String(cancelled),          sub: 'Tickets cancelados',                 color: '#6366f1', small: false },
    { label: 'Agencias activas',    value: String(activeAgencies),     sub: 'Con actividad',                      color: '#0d9488', small: false },
    { label: 'Tipos de error',      value: String(tipoEntries.length), sub: 'Categorías detectadas',              color: '#0f1f3d', small: false },
  ]

  // ── CHART DATA (serialized) ────────────────────────────────────────────────
  const tipoLabels   = JSON.stringify(tipoEntries.map(e => e[0]))
  const tipoData     = JSON.stringify(tipoEntries.map(e => e[1]))
  const tipoColors   = JSON.stringify(tipoEntries.map(e => tc(e[0])))
  const agLabels     = JSON.stringify(topAgencies.map(e => e[0]))
  const agData       = JSON.stringify(topAgencies.map(e => e[1]))
  const urgLabels    = JSON.stringify(Object.keys(urgCounts))
  const urgData      = JSON.stringify(Object.values(urgCounts))
  const urgColors    = JSON.stringify(Object.keys(urgCounts).map(uc))
  const statusLabels = JSON.stringify(statusEntries.map(e => e[0]))
  const statusData   = JSON.stringify(statusEntries.map(e => e[1]))
  const hourLabels   = JSON.stringify(Array.from({ length: 24 }, (_, i) => `${i}:00`))
  const hourData     = JSON.stringify(hourCounts)
  const hourColors   = JSON.stringify(hourCounts.map((v, i) => i === peakHour ? '#ef4444' : v >= maxHour * 0.7 ? '#f59e0b' : '#1a56db'))
  const groupLabels  = JSON.stringify(top8Agencies)
  const groupDatasets = JSON.stringify(top5Tipos.map(tipo => ({
    label: tipo,
    data: top8Agencies.map(ag => agTipoMatrix[ag][tipo] || 0),
    backgroundColor: tc(tipo),
  })))

  const insightText = `Se analizaron <strong>${total} tickets</strong> en el período. Tasa de resolución: <strong>${resolutionRate}%</strong>. Problema más frecuente: <strong>${mostFreqError}</strong>. Agencia con mayor actividad: <strong>${topAgency}</strong>. ${open} tickets permanecen abiertos.`
  const genDate = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#f8fafc;color:#1e293b;font-size:14px}
.header{background:#0f1f3d;color:#fff;padding:36px 48px}
.header-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.header h1{font-family:'DM Serif Display',serif;font-size:28px;font-weight:400;margin-bottom:6px}
.header .meta{font-size:12px;opacity:.6;display:flex;gap:14px;flex-wrap:wrap;margin-top:4px}
.badge{background:rgba(255,255,255,.15);padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;align-self:flex-start}
.insight{background:#0f1f3d;border-top:1px solid rgba(255,255,255,.08);padding:16px 48px}
.insight p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.7}
.insight strong{color:#60a5fa;font-weight:600}
.page{max-width:1060px;margin:0 auto;padding:32px 24px 64px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.kpi{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;border-top:3px solid var(--c)}
.kpi-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#64748b;margin-bottom:8px}
.kpi-val{font-size:30px;font-weight:700;color:#0f1f3d;line-height:1}
.kpi-val.sm{font-size:15px;font-weight:600;line-height:1.3;margin-top:4px}
.kpi-sub{font-size:11px;color:#94a3b8;margin-top:6px}
.sec{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:22px 24px;margin-bottom:16px}
.sec h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;margin-bottom:18px}
.two-col{display:grid;grid-template-columns:320px 1fr;gap:0;align-items:start}
.divider-r{padding-right:24px;border-right:1px solid #f1f5f9}
.divider-l{padding-left:24px}
.side2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.side2 .sec{margin-bottom:0}
.bar-row{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.bar-lbl{width:160px;flex-shrink:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#475569}
.bar-track{flex:1;height:9px;background:#f1f5f9;border-radius:5px;overflow:hidden}
.bar-fill{height:100%;border-radius:5px}
.bar-val{width:30px;text-align:right;font-size:12px;font-weight:600;color:#1e293b}
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
@media print{
  body{background:#fff}
  .sec,.kpi{break-inside:avoid}
  .header,.insight{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{padding:16px}
}
</style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <div>
      <h1>${title}</h1>
      <div class="meta">
        ${period ? `<span>Per\u00edodo: ${period}</span><span>\u00b7</span>` : ''}
        <span>Generado el ${genDate}</span>
      </div>
    </div>
    <div class="badge">${total} tickets analizados</div>
  </div>
</div>
<div class="insight"><p>${insightText}</p></div>

<div class="page">
  <div class="kpis">
    ${kpis.map(k => `<div class="kpi" style="--c:${k.color}">
      <div class="kpi-lbl">${k.label}</div>
      <div class="kpi-val${k.small ? ' sm' : ''}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('')}
  </div>

  <div class="sec">
    <h2>Clasificaci\u00f3n de problemas</h2>
    <div class="two-col">
      <div class="divider-r"><canvas id="tipoDonut" height="260"></canvas></div>
      <div class="divider-l">
        ${tipoEntries.map(([t, n]) => `<div class="bar-row">
          <div class="bar-lbl" title="${t}">${t}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${total ? Math.round((n / total) * 100) : 0}%;background:${tc(t)}"></div></div>
          <div class="bar-val">${n}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="sec">
    <h2>An\u00e1lisis por agencia \u2014 Top 10</h2>
    <canvas id="agChart" height="220"></canvas>
  </div>

  <div class="side2">
    <div class="sec">
      <h2>Distribuci\u00f3n por urgencia</h2>
      <canvas id="urgDonut" height="230"></canvas>
    </div>
    <div class="sec">
      <h2>Estado de tickets</h2>
      <canvas id="statusChart" height="230"></canvas>
    </div>
  </div>

  <div class="sec">
    <h2>Desempe\u00f1o operativo \u2014 Tickets por hora del d\u00eda</h2>
    <canvas id="hourChart" height="160"></canvas>
  </div>

  <div class="sec">
    <h2>Desempe\u00f1o operativo \u2014 Top 5 tipos de error por agencia</h2>
    <canvas id="groupedChart" height="200"></canvas>
  </div>

  <div class="footer">
    <span>${title}${period ? ` \u00b7 ${period}` : ''}</span>
    <span>${total} tickets \u00b7 ${activeAgencies} agencias \u00b7 ${tipoEntries.length} tipos de error</span>
  </div>
</div>

<script>
Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding = 14;

new Chart(document.getElementById('tipoDonut'), {
  type: 'doughnut',
  data: { labels: ${tipoLabels}, datasets: [{ data: ${tipoData}, backgroundColor: ${tipoColors}, borderWidth: 2, borderColor: '#fff' }] },
  options: { cutout: '62%', plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
});

new Chart(document.getElementById('agChart'), {
  type: 'bar',
  data: { labels: ${agLabels}, datasets: [{ data: ${agData}, backgroundColor: '#1a56db', borderRadius: 4 }] },
  options: {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } }, y: { grid: { display: false } } }
  }
});

new Chart(document.getElementById('urgDonut'), {
  type: 'doughnut',
  data: { labels: ${urgLabels}, datasets: [{ data: ${urgData}, backgroundColor: ${urgColors}, borderWidth: 2, borderColor: '#fff' }] },
  options: { cutout: '60%', plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
});

new Chart(document.getElementById('statusChart'), {
  type: 'bar',
  data: { labels: ${statusLabels}, datasets: [{ data: ${statusData}, backgroundColor: '#0d9488', borderRadius: 4 }] },
  options: {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } }, y: { grid: { display: false } } }
  }
});

new Chart(document.getElementById('hourChart'), {
  type: 'bar',
  data: { labels: ${hourLabels}, datasets: [{ data: ${hourData}, backgroundColor: ${hourColors}, borderRadius: 3 }] },
  options: {
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } } }
  }
});

new Chart(document.getElementById('groupedChart'), {
  type: 'bar',
  data: { labels: ${groupLabels}, datasets: ${groupDatasets} },
  options: {
    plugins: { legend: { position: 'bottom' } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } } }
  }
});
<\/script>
</body>
</html>`
}

export default function ReportsPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ client_id: '', title: '', period: '' })

  useEffect(() => {
    Promise.all([
      supabase.from('reports').select('*, client:clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
    ]).then(([{ data: r }, { data: c }]) => { setReports(r ?? []); setClients(c ?? []); setLoading(false) })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !form.title) return
    setCreating(true)
    const text = await file.text()
    const html = buildReport(text, form.title, form.period)
    const { data } = await supabase.from('reports').insert({ client_id: form.client_id || null, title: form.title, period: form.period || null, html_content: html }).select().single()
    if (data) { setReports(prev => [{ ...data, client: clients.find(c => c.id === form.client_id) }, ...prev]); setShowForm(false); setForm({ client_id: '', title: '', period: '' }); if (fileRef.current) fileRef.current.value = '' }
    setCreating(false)
  }

  async function deleteReport(id: string) {
    if (!confirm('¿Eliminar?')) return
    await supabase.from('reports').delete().eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/r/${token}`)
    setCopied(token); setTimeout(() => setCopied(null), 2000)
  }

  function downloadReport(report: any) {
    const blob = new Blob([report.html_content], { type: 'text/html' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${report.title.replace(/\s+/g,'_')}.html`; a.click()
  }

  return (
    <AppLayout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="page-title">Reportes</h1><p className="text-slate-500 text-sm mt-1">Genera y comparte reportes con tus clientes</p></div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={16} />Generar reporte</button>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} className="card mb-6 space-y-4 border-blue-200 bg-blue-50/20">
            <h2 className="font-semibold text-slate-700">Nuevo reporte</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label">Título *</label><input className="input bg-white" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Reporte Mensual Grupo Continental" /></div>
              <div><label className="label">Cliente</label><select className="input bg-white" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}><option value="">Sin cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="label">Período</label><input className="input bg-white" value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} placeholder="Febrero – Marzo 2026" /></div>
              <div className="col-span-2"><label className="label">CSV de Jira *</label><input ref={fileRef} type="file" accept=".csv,.xlsx" required className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1a56db] file:text-white hover:file:bg-[#1648c4] file:cursor-pointer" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-blue-100">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Generando...' : 'Generar reporte'}</button>
            </div>
          </form>
        )}
        {loading ? <div className="text-slate-400 text-sm">Cargando...</div>
        : !reports.length ? (
          <div className="card text-center py-16"><BarChart3 size={40} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-medium">Sin reportes</p><p className="text-slate-400 text-sm mt-1">Sube un CSV de Jira para generar un reporte</p></div>
        ) : (
          <div className="space-y-3">
            {reports.map((r: any) => (
              <div key={r.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{r.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    {r.client && <span>{r.client.name}</span>}
                    {r.period && <span>{r.period}</span>}
                    <span>{format(new Date(r.created_at), 'd MMM yyyy', { locale: es })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => downloadReport(r)} className="btn-secondary text-xs">Descargar</button>
                  <button onClick={() => copyLink(r.share_token)} className="btn-secondary text-xs flex items-center gap-1.5">
                    {copied === r.share_token ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                    {copied === r.share_token ? 'Copiado' : 'Copiar link'}
                  </button>
                  <Link href={`/r/${r.share_token}`} target="_blank" className="btn-secondary text-xs flex items-center gap-1.5"><Share2 size={13} />Ver</Link>
                  <button onClick={() => deleteReport(r.id)} className="text-slate-300 hover:text-red-400 transition-colors p-1"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
