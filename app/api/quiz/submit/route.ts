import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { quizId, answers, timeTaken } = await req.json()

    if (!quizId || !answers) {
      return NextResponse.json({ error: 'Quiz ID and answers are required.' }, { status: 400 })
    }

    // Verify quiz ownership
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id, user_id, total_questions')
      .eq('id', quizId)
      .eq('user_id', user.id)
      .single()

    if (!quiz) return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 })

    // Fetch questions with correct answers
    const { data: questions, error: qError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, correct_answer, topic, difficulty')
      .eq('quiz_id', quizId)
      .order('order_index')

    if (qError || !questions) {
      return NextResponse.json({ error: 'Failed to fetch quiz questions.' }, { status: 500 })
    }

    // Score the quiz
    let score = 0
    const wrongTopics: string[] = []
    const correctTopics: string[] = []

    for (const question of questions) {
      const userAnswer = answers[question.id]
      const isCorrect =
        userAnswer?.trim().toLowerCase() === question.correct_answer?.trim().toLowerCase()

      if (isCorrect) {
        score++
        if (question.topic) correctTopics.push(question.topic)
      } else {
        if (question.topic) wrongTopics.push(question.topic)
      }
    }

    const total = questions.length
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0
    const uniqueWeakTopics = Array.from(new Set(wrongTopics))

    // Save attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        answers,
        score,
        total,
        percentage,
        weak_topics: uniqueWeakTopics,
        time_taken: timeTaken || null,
      })
      .select()
      .single()

    if (attemptError) {
      return NextResponse.json({ error: 'Failed to save attempt.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      attempt,
      score,
      total,
      percentage,
      weakTopics: uniqueWeakTopics,
      strongTopics: Array.from(new Set(correctTopics)),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
