-- ================================================
-- StudyMate AI - Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- USERS (handled by Supabase Auth)
-- We create a profiles table that extends auth.users
-- ================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- PDFs TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.pdfs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own PDFs"
  ON public.pdfs FOR ALL
  USING (auth.uid() = user_id);

-- ================================================
-- PDF_PAGES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.pdf_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pdf_id UUID REFERENCES public.pdfs(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  extracted_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pdf_id, page_number)
);

ALTER TABLE public.pdf_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access pages of own PDFs"
  ON public.pdf_pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.pdfs
      WHERE pdfs.id = pdf_pages.pdf_id
        AND pdfs.user_id = auth.uid()
    )
  );

-- ================================================
-- STUDY_SESSIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pdf_id UUID REFERENCES public.pdfs(id) ON DELETE CASCADE NOT NULL,
  selected_start_page INTEGER DEFAULT 1,
  selected_end_page INTEGER DEFAULT 1,
  title TEXT,
  tutor_mode TEXT DEFAULT 'simple' CHECK (tutor_mode IN ('simple', 'exam', 'socratic', 'revision', 'teacher', 'bangla')),
  language TEXT DEFAULT 'english' CHECK (language IN ('english', 'bangla', 'english_bangla', 'simple_english')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own study sessions"
  ON public.study_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ================================================
-- CHAT_MESSAGES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  page_references TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access messages of own sessions"
  ON public.chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.study_sessions
      WHERE study_sessions.id = chat_messages.session_id
        AND study_sessions.user_id = auth.uid()
    )
  );

-- ================================================
-- FLASHCARD_SETS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.flashcard_sets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pdf_id UUID REFERENCES public.pdfs(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  title TEXT,
  start_page INTEGER,
  end_page INTEGER,
  total_cards INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own flashcard sets"
  ON public.flashcard_sets FOR ALL
  USING (auth.uid() = user_id);

-- ================================================
-- FLASHCARDS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  set_id UUID REFERENCES public.flashcard_sets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  page_number INTEGER,
  topic TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'known', 'difficult')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own flashcards"
  ON public.flashcards FOR ALL
  USING (auth.uid() = user_id);

-- ================================================
-- QUIZZES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pdf_id UUID REFERENCES public.pdfs(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  title TEXT,
  difficulty TEXT DEFAULT 'mixed' CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  question_type TEXT DEFAULT 'mixed',
  total_questions INTEGER DEFAULT 0,
  start_page INTEGER,
  end_page INTEGER,
  time_limit INTEGER,
  is_exam_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quizzes"
  ON public.quizzes FOR ALL
  USING (auth.uid() = user_id);

-- ================================================
-- QUIZ_QUESTIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'true_false', 'fill_blank', 'short_answer', 'long_answer', 'viva')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium',
  page_number INTEGER,
  topic TEXT,
  order_index INTEGER DEFAULT 0
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access questions of own quizzes"
  ON public.quiz_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = quiz_questions.quiz_id
        AND quizzes.user_id = auth.uid()
    )
  );

-- ================================================
-- QUIZ_ATTEMPTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  answers JSONB DEFAULT '{}',
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  weak_topics TEXT[],
  time_taken INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quiz attempts"
  ON public.quiz_attempts FOR ALL
  USING (auth.uid() = user_id);

-- ================================================
-- CHEAT_SHEETS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.cheat_sheets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pdf_id UUID REFERENCES public.pdfs(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL,
  cheat_sheet_type TEXT DEFAULT 'short' CHECK (cheat_sheet_type IN ('short', 'detailed', 'one_page', 'formula', 'exam_night')),
  start_page INTEGER,
  end_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cheat_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cheat sheets"
  ON public.cheat_sheets FOR ALL
  USING (auth.uid() = user_id);

-- ================================================
-- STUDY_PLANS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.study_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pdf_id UUID REFERENCES public.pdfs(id) ON DELETE CASCADE NOT NULL,
  exam_date DATE,
  daily_hours DECIMAL(3,1) DEFAULT 2.0,
  preparation_level TEXT DEFAULT 'beginner' CHECK (preparation_level IN ('beginner', 'medium', 'advanced')),
  target_score INTEGER DEFAULT 80,
  plan_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own study plans"
  ON public.study_plans FOR ALL
  USING (auth.uid() = user_id);

-- ================================================
-- INDEXES for Performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_pdfs_user_id ON public.pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_pages_pdf_id ON public.pdf_pages(pdf_id);
CREATE INDEX IF NOT EXISTS idx_pdf_pages_page_number ON public.pdf_pages(pdf_id, page_number);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_pdf ON public.study_sessions(user_id, pdf_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_set ON public.flashcards(set_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id, quiz_id);

-- ================================================
-- Supabase Storage Buckets
-- Run these in the Supabase dashboard under Storage
-- ================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);
--
-- CREATE POLICY "Users can upload own PDFs"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can view own PDFs"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete own PDFs"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
