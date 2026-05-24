'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import MarkdownContent from '@/components/MarkdownContent'
import {
  BookOpen, Send, Loader2, ChevronLeft, MessageSquare, FileText,
  Layers, Brain, Search, X, AlertCircle, Sparkles, RefreshCw,
  ThumbsDown, Minimize2, GraduationCap, Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { validatePageRange } from '@/lib/utils'
import type { PDF, TutorMode, StudyLanguage } from '@/types/pdf'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  pageRefs?: string[]
}

const TUTOR_MODES: { value: TutorMode; label: string; desc: string }[] = [
  { value: 'simple', label: 'Simple', desc: 'Easy to understand explanations' },
  { value: 'exam', label: 'Exam Coach', desc: 'Focus on exam-critical content' },
  { value: 'socratic', label: 'Socratic', desc: 'Guided questioning method' },
  { value: 'revision', label: 'Revision', desc: 'Fast bullet-point revision' },
  { value: 'teacher', label: 'Teacher', desc: 'Classroom-style teaching' },
  { value: 'bangla', label: 'Bangla', desc: 'Explanation in Bangla' },
]

const LANGUAGES: { value: StudyLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'bangla', label: 'বাংলা' },
  { value: 'english_bangla', label: 'English + বাংলা' },
  { value: 'simple_english', label: 'Simple English' },
]

export default function StudyWorkspace() {
  const { pdfId } = useParams<{ pdfId: string }>()
  const router = useRouter()

  const [pdf, setPdf] = useState<PDF | null>(null)
  const [loading, setLoading] = useState(true)
  const [startPage, setStartPage] = useState(1)
  const [endPage, setEndPage] = useState(10)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [tutorMode, setTutorMode] = useState<TutorMode>('simple')
  const [language, setLanguage] = useState<StudyLanguage>('english')
  const [activeTab, setActiveTab] = useState<'chat' | 'explain' | 'tools' | 'search'>('chat')
  const [explanation, setExplanation] = useState('')
  const [explainStyle, setExplainStyle] = useState('simple')
  const [generatingExplanation, setGeneratingExplanation] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<{ page_number: number; snippet: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initSession = useCallback(async (pdfData: PDF) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const end = Math.min(10, pdfData.total_pages)
    setEndPage(end)

    const { data: session } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        pdf_id: pdfData.id,
        selected_start_page: 1,
        selected_end_page: end,
        title: `Study Session — ${pdfData.file_name}`,
        tutor_mode: 'simple',
        language: 'english',
      })
      .select()
      .single()

    if (session) setSessionId(session.id)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch(`/api/pdf/${pdfId}`)
      const data = await res.json()
      if (!res.ok || !data.pdf) { router.push('/dashboard'); return }

      const pdfData = data.pdf as PDF
      setPdf(pdfData)

      if (pdfData.status === 'ready') {
        await initSession(pdfData)
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm your AI study tutor for **${pdfData.file_name}**.\n\n📄 This PDF has **${pdfData.total_pages} pages**.\n\nI've selected **pages 1–${Math.min(10, pdfData.total_pages)}** to start. You can change the page range using the selector above.\n\nWhat would you like to do?\n- Ask me anything about the selected pages\n- Click **Explain** to get a full explanation\n- Click **Tools** to generate flashcards, quizzes, or cheat sheets`,
        }])
      }
      setLoading(false)
    }
    init()
  }, [pdfId, router, initSession])

  const handlePageRangeApply = () => {
    if (!pdf) return
    const validation = validatePageRange(startPage, endPage, pdf.total_pages)
    if (!validation.valid) return toast.error(validation.error!)
    toast.success(`Page range set: ${startPage}–${endPage}`)
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Page range updated to **pages ${startPage}–${endPage}**. I'll now answer questions based on these ${endPage - startPage + 1} pages.`,
      },
    ])
  }

  const handleSend = async () => {
    if (!input.trim() || sending || !pdf) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    const thinking: Message = { id: 'thinking', role: 'assistant', content: '...' }
    setMessages((prev) => [...prev, thinking])

    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfId,
          sessionId,
          startPage,
          endPage,
          userQuestion: input,
          tutorMode,
          language,
          conversationHistory: history,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setMessages((prev) => prev.filter((m) => m.id !== 'thinking').concat({
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message,
        pageRefs: data.pageReferences,
      }))
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== 'thinking'))
      toast.error(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      setSending(false)
    }
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  const handleExplain = async () => {
    setGeneratingExplanation(true)
    setExplanation('')
    try {
      const res = await fetch('/api/generate/explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId, sessionId, startPage, endPage, style: explainStyle, language }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExplanation(data.explanation)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Explanation failed')
    } finally {
      setGeneratingExplanation(false)
    }
  }

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return
    setSearching(true)
    setSearchResults([])
    try {
      const res = await fetch('/api/pdf/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId, keyword: searchKeyword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSearchResults(data.results || [])
      if (data.results.length === 0) toast('No results found for this keyword.')
    } catch {
      toast.error('Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const handleGenerate = async (type: 'flashcards' | 'quiz' | 'cheatsheet') => {
    setGenerating(type)
    try {
      const payload: Record<string, unknown> = { pdfId, sessionId, startPage, endPage }
      if (type === 'flashcards') { payload.count = 10; payload.difficulty = 'mixed'; payload.type = 'mixed' }
      if (type === 'quiz') { payload.count = 10; payload.difficulty = 'mixed'; payload.questionType = 'mixed' }
      if (type === 'cheatsheet') { payload.type = 'short' }

      const res = await fetch(`/api/generate/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (type === 'flashcards') {
        toast.success(`${data.count} flashcards generated!`)
        router.push(`/flashcards/${data.set.id}`)
      } else if (type === 'quiz') {
        toast.success(`Quiz with ${data.quiz.total_questions} questions generated!`)
        router.push(`/quiz/${data.quiz.id}`)
      } else {
        toast.success('Cheat sheet generated!')
        setActiveTab('explain')
        setExplanation(data.cheatSheet.content)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading your PDF...</p>
        </div>
      </div>
    )
  }

  if (!pdf) return null

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <Link href="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BookOpen className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <h1 className="font-semibold text-slate-900 dark:text-white truncate text-sm sm:text-base">{pdf.file_name}</h1>
          <span className="badge-green hidden sm:inline">{pdf.total_pages} pages</span>
        </div>

        {/* Page Range Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Pages</span>
            <input
              type="number"
              min={1}
              max={pdf.total_pages}
              value={startPage}
              onChange={(e) => setStartPage(Number(e.target.value))}
              className="w-12 bg-transparent text-center text-sm font-medium text-slate-900 dark:text-white outline-none"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              min={1}
              max={pdf.total_pages}
              value={endPage}
              onChange={(e) => setEndPage(Number(e.target.value))}
              className="w-12 bg-transparent text-center text-sm font-medium text-slate-900 dark:text-white outline-none"
            />
          </div>
          <button onClick={handlePageRangeApply} className="btn-primary text-xs px-3 py-2">
            Apply
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="btn-outline text-xs px-2.5 py-2">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Settings Dropdown */}
      {showSettings && (
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Tutor Mode</p>
              <div className="flex flex-wrap gap-1.5">
                {TUTOR_MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setTutorMode(m.value)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      tutorMode === m.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-300'
                    }`}
                    title={m.desc}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Language</p>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLanguage(l.value)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      language === l.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-300'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'explain', label: 'Explain', icon: Sparkles },
            { id: 'tools', label: 'Tools', icon: Layers },
            { id: 'search', label: 'Search', icon: Search },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                    }`}
                  >
                    {msg.id === 'thinking' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="prose-studymate text-sm">
                        <MarkdownContent>{msg.content}</MarkdownContent>
                      </div>
                    )}
                    {msg.pageRefs && msg.pageRefs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.pageRefs.map((ref, i) => (
                          <span key={i} className="badge-primary text-xs">{ref}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {[
                  'Explain these pages simply',
                  'What are the key concepts?',
                  'Important for exam?',
                  'Give me examples',
                  'I don\'t understand',
                  'Make it shorter',
                ].map((action) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    className="flex-shrink-0 text-xs px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-3">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder={`Ask about pages ${startPage}–${endPage}...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="btn-primary px-4"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
                Answering from pages {startPage}–{endPage} • Mode: {tutorMode} • {language}
              </p>
            </div>
          </div>
        )}

        {/* EXPLAIN TAB */}
        {activeTab === 'explain' && (
          <div className="h-full flex flex-col">
            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Explanation Style</p>
                  <select
                    value={explainStyle}
                    onChange={(e) => setExplainStyle(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="simple">Simple Explanation</option>
                    <option value="detailed">Detailed Explanation</option>
                    <option value="beginner">Beginner-Friendly</option>
                    <option value="exam_focused">Exam-Focused</option>
                    <option value="bullet_points">Bullet Points</option>
                    <option value="teacher_style">Teacher Style</option>
                    <option value="bangla">Bangla</option>
                    <option value="english_bangla">English + Bangla</option>
                  </select>
                </div>
                <button
                  onClick={handleExplain}
                  disabled={generatingExplanation}
                  className="btn-primary mt-5"
                >
                  {generatingExplanation ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Explain Pages {startPage}–{endPage}</>
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {explanation ? (
                <div className="max-w-3xl mx-auto">
                  <div className="prose-studymate">
                    <MarkdownContent>{explanation}</MarkdownContent>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => { navigator.clipboard.writeText(explanation); toast.success('Copied!') }}
                      className="btn-secondary text-sm"
                    >
                      Copy
                    </button>
                    <button onClick={handleExplain} className="btn-outline text-sm gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Sparkles className="w-12 h-12 text-primary-300 dark:text-primary-700 mb-4" />
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Generate Explanation</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
                    Click the button above to get a comprehensive AI explanation of pages {startPage}–{endPage}.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOOLS TAB */}
        {activeTab === 'tools' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                Study Tools — Pages {startPage}–{endPage}
              </h2>
              <div className="grid gap-4">
                {/* Flashcards */}
                <div className="card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Flashcard Generator</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Auto-generate study flashcards with flip animation. Mark Known or Difficult.
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerate('flashcards')}
                    disabled={generating === 'flashcards'}
                    className="btn-primary w-full"
                  >
                    {generating === 'flashcards' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating 10 flashcards...</>
                    ) : (
                      'Generate Flashcards (10 cards)'
                    )}
                  </button>
                </div>

                {/* Quiz */}
                <div className="card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Quiz Generator</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Generate MCQs, True/False, and short-answer questions with difficulty levels.
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerate('quiz')}
                    disabled={generating === 'quiz'}
                    className="btn-primary w-full"
                  >
                    {generating === 'quiz' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating quiz...</>
                    ) : (
                      'Generate Quiz (10 questions)'
                    )}
                  </button>
                </div>

                {/* Cheat Sheet */}
                <div className="card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Cheat Sheet Generator</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Create a printable cheat sheet with key definitions, formulas, and exam points.
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerate('cheatsheet')}
                    disabled={generating === 'cheatsheet'}
                    className="btn-primary w-full"
                  >
                    {generating === 'cheatsheet' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating cheat sheet...</>
                    ) : (
                      'Generate Cheat Sheet'
                    )}
                  </button>
                </div>

                {/* Important for Exam button */}
                <div className="card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Important for Exam</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        AI identifies the most exam-critical content from your selected pages.
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('chat')
                      handleQuickAction('What are the most important topics, definitions, and likely exam questions from the selected pages?')
                    }}
                    className="btn-outline w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Show Exam-Important Content
                  </button>
                </div>

                {/* Quick Actions in chat */}
                <div className="card p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Quick Study Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "I don't understand", action: 'I don\'t understand. Please explain more simply with examples and analogies.' },
                      { label: 'Make it shorter', action: 'Make it shorter — give me only bullet points and key takeaways.' },
                      { label: 'Give examples', action: 'Give me practical examples for the main concepts on these pages.' },
                      { label: 'Key definitions', action: 'List all important definitions and terms from the selected pages.' },
                    ].map(({ label, action }) => (
                      <button
                        key={label}
                        onClick={() => { setActiveTab('chat'); handleQuickAction(action) }}
                        className="btn-secondary text-xs text-left flex items-center gap-2"
                      >
                        {label === "I don't understand" && <ThumbsDown className="w-3.5 h-3.5 flex-shrink-0" />}
                        {label === 'Make it shorter' && <Minimize2 className="w-3.5 h-3.5 flex-shrink-0" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="h-full flex flex-col">
            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Search inside PDF</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Search keyword..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} disabled={searching || !searchKeyword.trim()} className="btn-primary px-4">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
                {searchKeyword && (
                  <button onClick={() => { setSearchKeyword(''); setSearchResults([]) }} className="btn-outline px-3">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{searchResults.length} results for &quot;{searchKeyword}&quot;</p>
                  {searchResults.map((result, i) => (
                    <div key={i} className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="badge-primary">Page {result.page_number}</span>
                        <button
                          onClick={() => {
                            setStartPage(result.page_number)
                            setEndPage(Math.min(result.page_number + 5, pdf.total_pages))
                            setActiveTab('chat')
                            handleQuickAction(`Tell me about "${searchKeyword}" as it appears on page ${result.page_number}`)
                          }}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          Study this page →
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.snippet}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Search Inside PDF</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Enter a keyword to find relevant pages across the entire PDF.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
