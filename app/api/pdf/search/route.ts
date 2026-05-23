import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { searchInPDF } from '@/lib/pdfService'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { pdfId, keyword } = await req.json()

    if (!pdfId || !keyword || keyword.trim().length < 2) {
      return NextResponse.json({ error: 'PDF ID and keyword (min 2 characters) are required.' }, { status: 400 })
    }

    // Verify ownership
    const { data: pdf } = await supabase
      .from('pdfs')
      .select('id')
      .eq('id', pdfId)
      .eq('user_id', user.id)
      .single()

    if (!pdf) return NextResponse.json({ error: 'PDF not found.' }, { status: 404 })

    const results = await searchInPDF(pdfId, keyword.trim(), 15)

    return NextResponse.json({ results, keyword })
  } catch {
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
  }
}
