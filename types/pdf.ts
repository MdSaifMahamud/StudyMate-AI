export type PDFStatus = 'processing' | 'ready' | 'failed'

export interface PDF {
  id: string
  user_id: string
  file_name: string
  file_url: string
  file_size: number
  total_pages: number
  status: PDFStatus
  created_at: string
  updated_at: string
}

export interface PDFPage {
  id: string
  pdf_id: string
  page_number: number
  extracted_text: string
  created_at: string
}

export interface PageRange {
  start: number
  end: number
}

export interface PDFUploadResult {
  pdf: PDF
  success: boolean
  error?: string
}

export interface PDFSearchResult {
  page_number: number
  snippet: string
  keyword: string
}

export interface StudySession {
  id: string
  user_id: string
  pdf_id: string
  selected_start_page: number
  selected_end_page: number
  title?: string
  tutor_mode: TutorMode
  language: StudyLanguage
  created_at: string
  updated_at: string
  pdf?: PDF
}

export type TutorMode = 'simple' | 'exam' | 'socratic' | 'revision' | 'teacher' | 'bangla'
export type StudyLanguage = 'english' | 'bangla' | 'english_bangla' | 'simple_english'
