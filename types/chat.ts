export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  session_id: string
  role: MessageRole
  message: string
  page_references?: string[]
  created_at: string
}

export interface ChatRequest {
  pdfId: string
  sessionId: string
  startPage: number
  endPage: number
  userQuestion: string
  tutorMode: string
  language: string
  conversationHistory?: { role: MessageRole; content: string }[]
}

export interface ChatResponse {
  message: string
  pageReferences?: string[]
  sessionId: string
}

export interface ExplanationRequest {
  pdfId: string
  sessionId: string
  startPage: number
  endPage: number
  style: ExplanationStyle
  language: string
}

export type ExplanationStyle =
  | 'simple'
  | 'detailed'
  | 'beginner'
  | 'exam_focused'
  | 'bangla'
  | 'english_bangla'
  | 'bullet_points'
  | 'teacher_style'

export interface ExplanationResponse {
  explanation: string
  sessionId: string
}
