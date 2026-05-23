import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateCompletion } from '@/lib/aiService'
import { buildExplanationPrompt } from '@/lib/prompts'
import { buildContext } from '@/lib/pdfService'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let step = 'auth'
  console.log('[/api/generate/explanation] POST invoked')
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[/api/generate/explanation] auth result: user=', user?.id || 'null', 'authError=', authError?.message || 'none')
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    step = 'parse'
    const { pdfId, startPage, endPage, style, language } = await req.json()

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
    const prompt = buildExplanationPrompt({
      pdfName: pdf.file_name,
      startPage,
      endPage,
      context,
      style: style || 'simple',
      language: language || 'english',
    })

    step = 'ai-call'
    const result = await generateCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.5, maxTokens: 4096 }
    )

    return NextResponse.json({ explanation: result.content })
  } catch (err) {
    console.error(`[/api/generate/explanation] failed at step="${step}":`, err)
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: `[${step}] ${message}` }, { status: 500 })
  }
}
