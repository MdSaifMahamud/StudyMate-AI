import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { generateCompletion } from '@/lib/aiService'
import { buildStudyPlanPrompt } from '@/lib/prompts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { pdfId, startPage, endPage, examDate, dailyHours, preparationLevel, targetScore } =
      await req.json()

    if (!pdfId || !examDate) {
      return NextResponse.json({ error: 'PDF ID and exam date are required.' }, { status: 400 })
    }

    const { data: pdf } = await supabase
      .from('pdfs')
      .select('file_name, total_pages')
      .eq('id', pdfId)
      .eq('user_id', user.id)
      .single()

    if (!pdf) return NextResponse.json({ error: 'PDF not found.' }, { status: 404 })

    const prompt = buildStudyPlanPrompt({
      pdfName: pdf.file_name,
      totalPages: pdf.total_pages,
      startPage: startPage || 1,
      endPage: endPage || pdf.total_pages,
      examDate,
      dailyHours: dailyHours || 2,
      preparationLevel: preparationLevel || 'beginner',
      targetScore: targetScore || 80,
    })

    const result = await generateCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.5, maxTokens: 4096 }
    )

    // Save study plan
    const { data: plan } = await supabaseAdmin
      .from('study_plans')
      .insert({
        user_id: user.id,
        pdf_id: pdfId,
        exam_date: examDate,
        daily_hours: dailyHours || 2,
        preparation_level: preparationLevel || 'beginner',
        target_score: targetScore || 80,
        plan_content: result.content,
      })
      .select()
      .single()

    return NextResponse.json({ success: true, plan })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
