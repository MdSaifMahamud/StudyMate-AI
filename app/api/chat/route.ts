import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { generateCompletion } from '@/lib/aiService'
import { buildChatSystemPrompt, buildChatUserPrompt } from '@/lib/prompts'
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
    const { pdfId, sessionId, startPage, endPage, userQuestion, tutorMode, language, conversationHistory } =
      await req.json()

    if (!pdfId || !userQuestion || !startPage || !endPage) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    step = 'pdf-lookup'
    const { data: pdf, error: pdfError } = await supabase
      .from('pdfs')
      .select('file_name, status')
      .eq('id', pdfId)
      .eq('user_id', user.id)
      .single()

    if (pdfError) return NextResponse.json({ error: `DB error: ${pdfError.message}` }, { status: 500 })
    if (!pdf) return NextResponse.json({ error: 'PDF not found.' }, { status: 404 })
    if (pdf.status !== 'ready') return NextResponse.json({ error: 'PDF is still processing.' }, { status: 422 })

    step = 'build-context'
    // Limit context to 8000 chars — chat also carries history so needs tighter budget
    const context = await buildContext(pdfId, startPage, endPage, 60000)

    step = 'build-prompt'
    const systemPrompt = buildChatSystemPrompt({
      pdfName: pdf.file_name,
      startPage,
      endPage,
      tutorMode: tutorMode || 'simple',
      language: language || 'english',
    })

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(conversationHistory || []).slice(-4),
      {
        role: 'user' as const,
        content: buildChatUserPrompt({ context, question: userQuestion }),
      },
    ]

    step = 'ai-call'
    const result = await generateCompletion(messages, { temperature: 0.4, maxTokens: 4096 })
    console.log(`[/api/chat] ai-call succeeded, content length=${result.content.length}`)

    step = 'save-messages'
    const pageRefs = (result.content.match(/\[?[Pp]age\s+(\d+)\]?/g) || []).slice(0, 5)

    if (sessionId) {
      await supabaseAdmin.from('chat_messages').insert([
        { session_id: sessionId, role: 'user', message: userQuestion },
        {
          session_id: sessionId,
          role: 'assistant',
          message: result.content,
          page_references: pageRefs,
        },
      ])
    }

    return NextResponse.json({ message: result.content, pageReferences: pageRefs, sessionId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[/api/chat] failed at step="${step}":`, err)
    return NextResponse.json({ error: `[${step}] ${message}` }, { status: 500 })
  }
}
