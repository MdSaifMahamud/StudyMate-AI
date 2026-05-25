import { NextRequest, NextResponse } from 'next/server'
import { generateCompletion } from '@/lib/aiService'
import { buildChatSystemPrompt, buildChatUserPrompt } from '@/lib/prompts'
import { buildPageRangeContext } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 60

type PageData = { page_number: number; extracted_text: string }

export async function POST(req: NextRequest) {
  try {
    const { pages, startPage, endPage, question, history, pdfName } = await req.json()

    if (!Array.isArray(pages) || !question?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const filtered = (pages as PageData[]).filter(
      (p) => p.page_number >= startPage && p.page_number <= endPage
    )

    if (filtered.length === 0) {
      return NextResponse.json({ error: 'No pages found in the selected range.' }, { status: 400 })
    }

    const context = buildPageRangeContext(filtered)

    const systemPrompt = buildChatSystemPrompt({
      pdfName: pdfName || 'your document',
      startPage,
      endPage,
      tutorMode: 'simple',
      language: 'english',
    })

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-4) : []),
      { role: 'user' as const, content: buildChatUserPrompt({ context, question }) },
    ]

    const result = await generateCompletion(messages, { temperature: 0.4, maxTokens: 2048 })

    return NextResponse.json({ message: result.content })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
