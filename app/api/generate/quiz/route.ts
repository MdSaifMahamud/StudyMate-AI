import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { generateCompletion } from '@/lib/aiService'
import { buildQuizPrompt } from '@/lib/prompts'
import { buildContext } from '@/lib/pdfService'
import { extractJSON } from '@/lib/utils'
import type { QuizAIOutput } from '@/types/quiz'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let step = 'auth'
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    step = 'parse'
    const { pdfId, sessionId, startPage, endPage, count, difficulty, questionType, timeLimit, isExamMode } =
      await req.json()

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
    const questionCount = Math.min(Math.max(count || 10, 1), 30)

    step = 'build-prompt'
    const prompt = buildQuizPrompt({
      pdfName: pdf.file_name,
      startPage,
      endPage,
      context,
      count: questionCount,
      difficulty: difficulty || 'mixed',
      questionType: questionType || 'mixed',
    })

    step = 'ai-call'
    const result = await generateCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 4096 }
    )

    step = 'parse-json'
    const questions = extractJSON<QuizAIOutput[]>(result.content)

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.error('[/api/generate/quiz] AI output could not be parsed. Raw content first 300 chars:', result.content.slice(0, 300))
      return NextResponse.json({ error: 'Failed to generate quiz questions. Please try again.' }, { status: 500 })
    }

    step = 'save-quiz'
    // Create quiz record
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        user_id: user.id,
        pdf_id: pdfId,
        session_id: sessionId || null,
        title: `Quiz — ${pdf.file_name} (Pages ${startPage}–${endPage})`,
        difficulty: difficulty || 'mixed',
        question_type: questionType || 'mixed',
        total_questions: questions.length,
        start_page: startPage,
        end_page: endPage,
        time_limit: timeLimit || null,
        is_exam_mode: isExamMode || false,
      })
      .select()
      .single()

    if (quizError || !quiz) {
      console.error('[/api/generate/quiz] quizzes insert error:', quizError)
      return NextResponse.json({ error: 'Failed to create quiz.' }, { status: 500 })
    }

    step = 'save-questions'
    // Insert questions
    const { data: savedQuestions, error: qError } = await supabaseAdmin
      .from('quiz_questions')
      .insert(
        questions.map((q, index) => ({
          quiz_id: quiz.id,
          question: q.question,
          question_type: q.type?.toLowerCase().replace(' ', '_') || 'mcq',
          options: q.options ? JSON.stringify(q.options) : null,
          correct_answer: q.correctAnswer,
          explanation: q.explanation || '',
          difficulty: q.difficulty?.toLowerCase() || 'medium',
          page_number: q.pageNumber || null,
          topic: q.topic || null,
          order_index: index,
        }))
      )
      .select()

    if (qError) {
      return NextResponse.json({ error: 'Failed to save quiz questions.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      quiz: {
        ...quiz,
        questions: (savedQuestions || []).map((q) => ({
          ...q,
          options: q.options ? JSON.parse(q.options as string) : null,
        })),
      },
    })
  } catch (err) {
    console.error(`[/api/generate/quiz] failed at step="${step}":`, err)
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: `[${step}] ${message}` }, { status: 500 })
  }
}
