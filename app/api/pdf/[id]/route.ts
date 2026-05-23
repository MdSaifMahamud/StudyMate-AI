import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { deletePDFFromStorage } from '@/lib/pdfService'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: pdf, error } = await supabase
      .from('pdfs')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !pdf) return NextResponse.json({ error: 'PDF not found.' }, { status: 404 })

    return NextResponse.json({ pdf })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch PDF.' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: pdf, error: fetchError } = await supabase
      .from('pdfs')
      .select('file_url')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !pdf) return NextResponse.json({ error: 'PDF not found.' }, { status: 404 })

    // Delete from storage
    if (pdf.file_url) {
      await deletePDFFromStorage(pdf.file_url).catch(() => {})
    }

    // Delete from database (cascade deletes pages, sessions, etc.)
    const { error: deleteError } = await supabaseAdmin
      .from('pdfs')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete PDF.' }, { status: 500 })
  }
}
