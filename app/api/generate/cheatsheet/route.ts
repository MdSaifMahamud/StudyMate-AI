import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { generateCompletion } from '@/lib/aiService'
import { buildCheatSheetPrompt } from '@/lib/prompts'
import { buildContext } from '@/lib/pdfService'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let step = 'auth'
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    step = 'parse'
    const { pdfId, sessionId, startPage, endPage, type } = await req.json()

    if (!pdfId || !startPage || !endPage) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    step = 'pdf-lookup'
    const { data: pdf } = await supabase
      .from('pdfs')
      .select('file_name')
      .eq('id', pdfId)
      .eq('user_id', user.id)
      .single()

    if (!pdf) return NextResponse.json({ error: 'PDF not found.' }, { status: 404 })

    step = 'build-context'
    const context = await buildContext(pdfId, startPage, endPage)

    step = 'build-prompt'
    const prompt = buildCheatSheetPrompt({
      pdfName: pdf.file_name,
      startPage,
      endPage,
      context,
      type: type || 'short',
    })

    step = 'ai-call'
    const result = await generateCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 8192 }
    )

    step = 'save-cheatsheet'
    // Save cheat sheet
    const { data: cheatSheet, error: saveError } = await supabaseAdmin
      .from('cheat_sheets')
      .insert({
        user_id: user.id,
        pdf_id: pdfId,
        session_id: sessionId || null,
        title: `Cheat Sheet — ${pdf.file_name} (Pages ${startPage}–${endPage})`,
        content: result.content,
        cheat_sheet_type: type || 'short',
        start_page: startPage,
        end_page: endPage,
      })
      .select()
      .single()

    if (saveError) {
      console.error('[/api/generate/cheatsheet] cheat_sheets insert error:', saveError)
      return NextResponse.json({ error: 'Failed to save cheat sheet.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, cheatSheet })
  } catch (err) {
    console.error(`[/api/generate/cheatsheet] failed at step="${step}":`, err)
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: `[${step}] ${message}` }, { status: 500 })
  }
}
