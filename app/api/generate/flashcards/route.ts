import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { generateCompletion } from '@/lib/aiService'
import { buildFlashcardPrompt } from '@/lib/prompts'
import { buildContext } from '@/lib/pdfService'
import { extractJSON } from '@/lib/utils'
import type { FlashcardAIOutput } from '@/types/flashcard'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let step = 'auth'
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    step = 'parse'
    const { pdfId, sessionId, startPage, endPage, count, difficulty, type } = await req.json()

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
    const cardCount = Math.min(Math.max(count || 10, 1), 30)

    const prompt = buildFlashcardPrompt({
      pdfName: pdf.file_name,
      startPage,
      endPage,
      context,
      count: cardCount,
      difficulty: difficulty || 'mixed',
      type: type || 'mixed',
    })

    step = 'ai-call'
    const result = await generateCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.4, maxTokens: 4096 }
    )

    step = 'parse-json'
    const cards = extractJSON<FlashcardAIOutput[]>(result.content)

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      console.error('[/api/generate/flashcards] AI output could not be parsed as JSON array. Raw content length:', result.content.length, 'First 300 chars:', result.content.slice(0, 300))
      return NextResponse.json({ error: 'Failed to generate flashcards. Please try again.' }, { status: 500 })
    }

    step = 'save-flashcard-set'
    // Create flashcard set
    const { data: flashcardSet, error: setError } = await supabaseAdmin
      .from('flashcard_sets')
      .insert({
        user_id: user.id,
        pdf_id: pdfId,
        session_id: sessionId || null,
        title: `${pdf.file_name} — Pages ${startPage}–${endPage}`,
        start_page: startPage,
        end_page: endPage,
        total_cards: cards.length,
      })
      .select()
      .single()

    if (setError || !flashcardSet) {
      console.error('[/api/generate/flashcards] flashcard_sets insert error:', setError)
      return NextResponse.json({ error: 'Failed to save flashcard set.' }, { status: 500 })
    }

    step = 'save-flashcards'
    // Insert individual flashcards
    const { data: savedCards, error: cardsError } = await supabaseAdmin
      .from('flashcards')
      .insert(
        cards.map((card) => ({
          set_id: flashcardSet.id,
          user_id: user.id,
          front_text: card.front,
          back_text: card.back,
          difficulty: card.difficulty?.toLowerCase() || 'medium',
          page_number: card.pageNumber || null,
          topic: card.topic || null,
          status: 'new',
        }))
      )
      .select()

    if (cardsError) {
      return NextResponse.json({ error: 'Failed to save flashcards.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      set: { ...flashcardSet, flashcards: savedCards },
      count: savedCards?.length || 0,
    })
  } catch (err) {
    console.error(`[/api/generate/flashcards] failed at step="${step}":`, err)
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: `[${step}] ${message}` }, { status: 500 })
  }
}
