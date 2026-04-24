import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: rows } = await supabase.rpc('get_report_by_share_token', { p_token: token })
  const report = Array.isArray(rows) ? rows[0] : rows
  if (!report || !report.html_content) notFound()
  return (
    <div
      dangerouslySetInnerHTML={{ __html: report.html_content }}
      className="min-h-screen bg-background text-foreground"
    />
  )
}
