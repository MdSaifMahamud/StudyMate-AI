import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const [pdfs, sessions, flashcardSets, quizAttempts] = await Promise.all([
      supabase.from('pdfs').select('id, file_name, created_at, status').eq('user_id', user.id),
      supabase.from('study_sessions').select('id, created_at, pdf_id').eq('user_id', user.id),
      supabase.from('flashcard_sets').select('id, total_cards, created_at').eq('user_id', user.id),
      supabase
        .from('quiz_attempts')
        .select('id, score, total, percentage, weak_topics, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false }),
    ])

    const attempts = quizAttempts.data || []
    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length)
        : 0

    const allWeakTopics = attempts.flatMap((a) => a.weak_topics || [])
    const topicFrequency: Record<string, number> = {}
    for (const topic of allWeakTopics) {
      topicFrequency[topic] = (topicFrequency[topic] || 0) + 1
    }
    const weakTopics = Object.entries(topicFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic)

    const totalFlashcards = (flashcardSets.data || []).reduce((sum, s) => sum + (s.total_cards || 0), 0)

    return NextResponse.json({
      stats: {
        totalPDFs: pdfs.data?.length || 0,
        totalSessions: sessions.data?.length || 0,
        totalFlashcards,
        totalQuizzes: attempts.length,
        averageScore: avgScore,
        weakTopics,
        recentAttempts: attempts.slice(0, 5),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch progress.' }, { status: 500 })
  }
}
