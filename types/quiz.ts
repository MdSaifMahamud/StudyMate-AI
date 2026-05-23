export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'mixed'
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'long_answer' | 'viva'

export interface QuizQuestion {
  id: string
  quiz_id: string
  question: string
  question_type: QuestionType
  options?: string[]
  correct_answer: string
  explanation?: string
  difficulty: QuizDifficulty
  page_number?: number
  topic?: string
  order_index: number
}

export interface Quiz {
  id: string
  user_id: string
  pdf_id: string
  session_id?: string
  title?: string
  difficulty: QuizDifficulty
  question_type: string
  total_questions: number
  start_page?: number
  end_page?: number
  time_limit?: number
  is_exam_mode: boolean
  created_at: string
  questions?: QuizQuestion[]
}

export interface QuizGenerateRequest {
  pdfId: string
  sessionId: string
  startPage: number
  endPage: number
  count: number
  difficulty: QuizDifficulty
  questionType: QuestionType | 'mixed'
  timeLimit?: number
  isExamMode?: boolean
}

export interface QuizAIOutput {
  question: string
  type: string
  options?: string[]
  correctAnswer: string
  explanation: string
  pageNumber?: number
  topic?: string
  difficulty: string
}

export interface QuizAttempt {
  id: string
  user_id: string
  quiz_id: string
  answers: Record<string, string>
  score: number
  total: number
  percentage: number
  weak_topics?: string[]
  time_taken?: number
  completed_at: string
}

export interface QuizResult {
  attempt: QuizAttempt
  questions: QuizQuestion[]
  correctCount: number
  incorrectCount: number
  weakTopics: string[]
  strongTopics: string[]
}

export interface QuizSubmitRequest {
  quizId: string
  answers: Record<string, string>
  timeTaken?: number
}
