import { NextRequest, NextResponse } from 'next/server'
import { generateCompletion } from '@/lib/aiService'
import {
  buildExplanationPrompt,
  buildFlashcardPrompt,
  buildQuizPrompt,
  buildCheatSheetPrompt,
} from '@/lib/prompts'
import { buildPageRangeContext, extractJSON } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 60

type PageData = { page_number: number; extracted_text: string }

export async function POST(req: NextRequest) {
  try {
    const { pages, startPage, endPage, type, pdfName } = await req.json()

    if (!Array.isArray(pages) || !type) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const filtered = (pages as PageData[]).filter(
      (p) => p.page_number >= startPage && p.page_number <= endPage
    )

    if (filtered.length === 0) {
      return NextResponse.json({ error: 'No pages found in the selected range.' }, { status: 400 })
    }

    const context = buildPageRangeContext(filtered)
    const name = pdfName || 'your document'

    let prompt: string
    switch (type) {
      case 'explanation':
        prompt = buildExplanationPrompt({ pdfName: name, startPage, endPage, context, style: 'simple', language: 'english' })
        break
      case 'flashcards':
        prompt = buildFlashcardPrompt({ pdfName: name, startPage, endPage, context, count: 5, difficulty: 'mixed', type: 'mixed' })
        break
      case 'quiz':
        prompt = buildQuizPrompt({ pdfName: name, startPage, endPage, context, count: 5, difficulty: 'mixed', questionType: 'mixed' })
        break
      case 'cheatsheet':
        prompt = buildCheatSheetPrompt({ pdfName: name, startPage, endPage, context, type: 'short' })
        break
      default:
        return NextResponse.json({ error: 'Invalid type.' }, { status: 400 })
    }

    const result = await generateCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 4096 }
    )

    const content = result.content

    if (type === 'flashcards' || type === 'quiz') {
      const parsed = extractJSON(content)
      return NextResponse.json({ content, parsed, type })
    }

    return NextResponse.json({ content, type })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
