import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client using @supabase/ssr so sessions are stored in cookies,
// which the server middleware can read. Do NOT use createClient here.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          email: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
      }
      pdfs: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_url: string
          file_size: number
          total_pages: number
          status: 'processing' | 'ready' | 'failed'
          created_at: string
          updated_at: string
        }
      }
      pdf_pages: {
        Row: {
          id: string
          pdf_id: string
          page_number: number
          extracted_text: string
          created_at: string
        }
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          pdf_id: string
          selected_start_page: number
          selected_end_page: number
          title: string | null
          tutor_mode: string
          language: string
          created_at: string
          updated_at: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: string
          message: string
          page_references: string[] | null
          created_at: string
        }
      }
    }
  }
}
