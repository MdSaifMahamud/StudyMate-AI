export type FlashcardDifficulty = 'easy' | 'medium' | 'hard'
export type FlashcardStatus = 'new' | 'known' | 'difficult'
export type FlashcardType = 'definition' | 'concept' | 'formula' | 'exam_focused' | 'mixed'

export interface Flashcard {
  id: string
  set_id: string
  user_id: string
  front_text: string
  back_text: string
  difficulty: FlashcardDifficulty
  page_number?: number
  topic?: string
  status: FlashcardStatus
  created_at: string
}

export interface FlashcardSet {
  id: string
  user_id: string
  pdf_id: string
  session_id?: string
  title?: string
  start_page?: number
  end_page?: number
  total_cards: number
  created_at: string
  flashcards?: Flashcard[]
}

export interface FlashcardGenerateRequest {
  pdfId: string
  sessionId: string
  startPage: number
  endPage: number
  count: number
  difficulty: FlashcardDifficulty | 'mixed'
  type: FlashcardType
}

export interface FlashcardAIOutput {
  front: string
  back: string
  pageNumber?: number
  topic?: string
  difficulty: FlashcardDifficulty
}

export interface FlashcardProgress {
  total: number
  known: number
  difficult: number
  remaining: number
  percentage: number
}
