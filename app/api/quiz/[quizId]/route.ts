import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: quiz } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', params.quizId)
      .eq('user_id', user.id)
      .single()

    if (!quiz) return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 })

    const { data: questions } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', params.quizId)
      .order('order_index')

    const parsedQuestions = (questions || []).map((q) => ({
      ...q,
      options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
    }))

    return NextResponse.json({ quiz: { ...quiz, questions: parsedQuestions } })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch quiz.' }, { status: 500 })
  }
}
