import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: report } = await supabase.from('reports').select('*').eq('share_token', token).single()
  if (!report || !report.html_content) notFound()
  return <div dangerouslySetInnerHTML={{ __html: report.html_content }} className="min-h-screen" />
}
