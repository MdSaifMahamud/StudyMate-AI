import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const setId = searchParams.get('setId')

    if (setId) {
      // Fetch specific set
      const { data: set } = await supabase
        .from('flashcard_sets')
        .select('*, flashcards(*)')
        .eq('id', setId)
        .eq('user_id', user.id)
        .single()

      return NextResponse.json({ set })
    }

    // Fetch all sets
    const { data: sets } = await supabase
      .from('flashcard_sets')
      .select('*, flashcards(id, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ sets: sets || [] })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch flashcards.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { cardId, status } = await req.json()

    if (!cardId || !status) {
      return NextResponse.json({ error: 'Card ID and status are required.' }, { status: 400 })
    }

    if (!['new', 'known', 'difficult'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('flashcards')
      .update({ status })
      .eq('id', cardId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update flashcard.' }, { status: 500 })
  }
}
