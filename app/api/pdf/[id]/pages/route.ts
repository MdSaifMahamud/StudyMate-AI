import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const startPage = parseInt(searchParams.get('start') || '1')
    const endPage = parseInt(searchParams.get('end') || '9999')

    // Verify ownership
    const { data: pdf } = await supabase
      .from('pdfs')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!pdf) return NextResponse.json({ error: 'PDF not found.' }, { status: 404 })

    const { data: pages, error } = await supabase
      .from('pdf_pages')
      .select('page_number, extracted_text')
      .eq('pdf_id', params.id)
      .gte('page_number', startPage)
      .lte('page_number', endPage)
      .order('page_number', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ pages: pages || [] })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch pages.' }, { status: 500 })
  }
}
