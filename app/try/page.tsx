'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Upload, Send, BookOpen, FileText, Brain,
  ClipboardList, Zap, ArrowLeft, Loader2,
  ChevronRight, AlertCircle, Sparkles,
} from 'lucide-react'
import GuestAuthGate from '@/components/GuestAuthGate'
import MarkdownContent from '@/components/MarkdownContent'
import toast, { Toaster } from 'react-hot-toast'

const MAX_FREE_ACTIONS = 3
const GUEST_STORAGE_KEY = 'sm_guest_actions'
const GUEST_MAX_PAGES = 20

type PageData = { page_number: number; extracted_text: string }

type GenerateType = 'explanation' | 'flashcards' | 'quiz' | 'cheatsheet'

type FlashcardItem = { front: string; back: string; difficulty?: string }
type QuizQuestion = {
  question: string
  type: string
  options?: string[]
  correctAnswer: string
  explanation?: string
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  genType?: GenerateType
  parsed?: FlashcardItem[] | QuizQuestion[]
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FlashcardsResult({ cards }: { cards: FlashcardItem[] }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({})
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {cards.length} Flashcards — tap to reveal answer
      </p>
      {cards.map((card, i) => (
        <button
          key={i}
          onClick={() => setFlipped((p) => ({ ...p, [i]: !p[i] }))}
          className="w-full text-left p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600 rounded-xl transition-all"
        >
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
            {flipped[i] ? 'Answer' : 'Question'}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {flipped[i] ? card.back : card.front}
          </p>
        </button>
      ))}
      <p className="text-xs text-slate-400 dark:text-slate-500 pt-1 text-center">
        Sign up for full flip-card mode with spaced repetition tracking
      </p>
    </div>
  )
}

function QuizResult({ questions }: { questions: QuizQuestion[] }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [selected, setSelected] = useState<Record<number, string>>({})

  const pick = (qi: number, opt: string) => {
    if (revealed[qi]) return
    setSelected((p) => ({ ...p, [qi]: opt }))
    setRevealed((p) => ({ ...p, [qi]: true }))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {questions.length} Quiz Questions
      </p>
      {questions.map((q, i) => (
        <div key={i} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">
            <span className="text-slate-400 dark:text-slate-500 mr-1">Q{i + 1}.</span>
            {q.question}
          </p>

          {q.options ? (
            <div className="space-y-1.5">
              {q.options.map((opt, j) => {
                const letter = String.fromCharCode(65 + j)
                const isCorrect = revealed[i] && opt === q.correctAnswer
                const isWrong = revealed[i] && selected[i] === opt && opt !== q.correctAnswer
                return (
                  <button
                    key={j}
                    onClick={() => pick(i, opt)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                      isCorrect
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700 dark:text-green-300'
                        : isWrong
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-400 text-red-700 dark:text-red-300'
                        : selected[i] === opt
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <span className="font-medium mr-2 text-slate-500 dark:text-slate-400">{letter}.</span>
                    {opt}
                  </button>
                )
              })}
            </div>
          ) : (
            !revealed[i] ? (
              <button
                onClick={() => setRevealed((p) => ({ ...p, [i]: true }))}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Show answer
              </button>
            ) : (
              <div className="p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">{q.correctAnswer}</p>
              </div>
            )
          )}

          {revealed[i] && q.explanation && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
              {q.explanation}
            </p>
          )}
        </div>
      ))}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        Sign up for timed exam mode, score tracking, and weak topic analysis
      </p>
    </div>
  )
}

function AssistantBubble({ msg }: { msg: Message }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center flex-none mt-0.5">
        <BookOpen className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
        {msg.genType === 'flashcards' && Array.isArray(msg.parsed) ? (
          <FlashcardsResult cards={msg.parsed as FlashcardItem[]} />
        ) : msg.genType === 'quiz' && Array.isArray(msg.parsed) ? (
          <QuizResult questions={msg.parsed as QuizQuestion[]} />
        ) : (
          <div className="text-sm prose-studymate">
            <MarkdownContent>{msg.content}</MarkdownContent>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: { type: GenerateType; icon: React.ElementType; label: string; desc: string }[] = [
  { type: 'explanation', icon: BookOpen, label: 'Explanation', desc: 'Understand the concepts' },
  { type: 'flashcards', icon: Brain, label: 'Flashcards', desc: '5 interactive study cards' },
  { type: 'quiz', icon: ClipboardList, label: 'Quiz', desc: '5 practice questions' },
  { type: 'cheatsheet', icon: FileText, label: 'Cheat Sheet', desc: 'Key points at a glance' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TryPage() {
  const [phase, setPhase] = useState<'upload' | 'study'>('upload')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pdfName, setPdfName] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [pages, setPages] = useState<PageData[]>([])
  const [startPage, setStartPage] = useState(1)
  const [endPage, setEndPage] = useState(5)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [guestActions, setGuestActions] = useState(0)
  const [showGate, setShowGate] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY)
    if (stored) setGuestActions(parseInt(stored, 10) || 0)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, generating])

  const actionsRemaining = MAX_FREE_ACTIONS - guestActions

  const useAction = (): boolean => {
    if (guestActions >= MAX_FREE_ACTIONS) {
      setShowGate(true)
      return false
    }
    return true
  }

  const recordAction = () => {
    const next = guestActions + 1
    setGuestActions(next)
    localStorage.setItem(GUEST_STORAGE_KEY, String(next))
    if (next >= MAX_FREE_ACTIONS) {
      setTimeout(() => setShowGate(true), 1800)
    }
  }

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.error('Please upload a PDF file.'); return }
    if (file.size > 20 * 1024 * 1024) { toast.error('File too large. Max 20 MB.'); return }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/guest/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Upload failed.'); return }

      const clampedEnd = Math.min(data.totalPages, 10)
      setPdfName(data.fileName)
      setTotalPages(data.totalPages)
      setPages(data.pages)
      setStartPage(1)
      setEndPage(clampedEnd)
      setPhase('study')

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `I've read **${data.fileName}** (${data.totalPages} pages). Currently focused on **pages 1–${clampedEnd}**.\n\nAsk me anything about this material, or use the tools on the left to generate flashcards, a quiz, cheat sheet, or explanation.\n\n> You have **${MAX_FREE_ACTIONS} free AI actions**. Sign up for unlimited access.`,
      }])
    } catch {
      toast.error('Failed to process PDF. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async () => {
    const q = input.trim()
    if (!q || sending || generating) return
    if (!useAction()) return

    setMessages((p) => [...p, { id: Date.now().toString(), role: 'user', content: q }])
    setInput('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    setSending(true)

    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/guest/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages, startPage, endPage, question: q, history, pdfName }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to get a response.'); return }

      setMessages((p) => [...p, { id: Date.now() + '_a', role: 'assistant', content: data.message }])
      recordAction()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleGenerate = async (type: GenerateType) => {
    if (sending || generating) return
    if (!useAction()) return

    if (endPage - startPage >= GUEST_MAX_PAGES) {
      toast.error(`Guest mode supports up to ${GUEST_MAX_PAGES} pages. Sign up for 50-page ranges.`)
      return
    }

    const labels: Record<GenerateType, string> = {
      explanation: 'Explanation', flashcards: 'Flashcards', quiz: 'Quiz', cheatsheet: 'Cheat Sheet',
    }
    setMessages((p) => [...p, {
      id: Date.now().toString() + '_req',
      role: 'user',
      content: `Generate ${labels[type]} for pages ${startPage}–${endPage}`,
    }])
    setGenerating(true)

    try {
      const res = await fetch('/api/guest/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages, startPage, endPage, type, pdfName }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Generation failed.'); return }

      setMessages((p) => [...p, {
        id: Date.now() + '_gen',
        role: 'assistant',
        content: data.content,
        genType: type,
        parsed: data.parsed ?? undefined,
      }])
      recordAction()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Upload phase ─────────────────────────────────────────────────────────────

  if (phase === 'upload') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-primary-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <Toaster position="top-center" />

        <header className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">StudyMate AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400 dark:text-slate-500">No account needed</span>
            <Link href="/login" className="btn-outline text-sm px-4 py-2">Log In</Link>
            <Link href="/signup" className="btn-primary text-sm px-4 py-2">Sign Up Free</Link>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-lg w-full text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded-full text-sm font-medium mb-5">
              <Zap className="w-3.5 h-3.5" />
              Try free — no account needed
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
              Upload your PDF to get started
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base">
              You get <strong className="text-slate-700 dark:text-slate-200">{MAX_FREE_ACTIONS} free AI interactions</strong> to try chat, flashcards, quizzes, and explanations.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`max-w-lg w-full border-2 border-dashed rounded-2xl p-14 cursor-pointer transition-all text-center select-none ${
              dragOver
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-600 hover:bg-primary-50/40 dark:hover:bg-primary-900/10'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
                <p className="font-medium text-slate-700 dark:text-slate-300">Extracting text from PDF…</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <p className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
                  {dragOver ? 'Drop it here!' : 'Drop your PDF here'}
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">or click to browse</p>
                <span className="inline-block px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
                  Choose PDF File
                </span>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">PDF only · Max 20 MB</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />

          {/* Quick feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['AI Chat', 'Flashcards', 'Quizzes', 'Cheat Sheets', 'Explanations'].map((f) => (
              <span key={f} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                <Sparkles className="w-3 h-3 text-primary-400" /> {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Study phase ───────────────────────────────────────────────────────────────

  const isBusy = sending || generating

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Toaster position="top-center" />
      {showGate && (
        <GuestAuthGate
          actionsUsed={guestActions}
          maxActions={MAX_FREE_ACTIONS}
          onDismiss={actionsRemaining > 0 ? () => setShowGate(false) : undefined}
        />
      )}

      {/* Header */}
      <header className="flex-none flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <Link href="/" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-none">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center flex-none">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate min-w-0 flex-1">
          {pdfName}
        </p>
        <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline flex-none">{totalPages} pages</span>

        {/* Actions counter */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border flex-none ${
          actionsRemaining > 1
            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
            : actionsRemaining === 1
            ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
        }`}>
          <Zap className="w-3 h-3" />
          {actionsRemaining > 0
            ? `${actionsRemaining} free action${actionsRemaining !== 1 ? 's' : ''} left`
            : 'No actions left'}
        </div>

        <Link href="/signup" className="btn-primary text-sm px-4 py-2 flex-none">Sign Up Free</Link>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">

        {/* Sidebar */}
        <aside className="hidden md:flex w-72 flex-none flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">

          {/* Page range */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Page Range</p>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">From</label>
                <input
                  type="number" min={1} max={totalPages} value={startPage}
                  onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input w-full text-sm py-2"
                />
              </div>
              <span className="text-slate-400 mt-4">–</span>
              <div className="flex-1">
                <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">To</label>
                <input
                  type="number" min={1} max={totalPages} value={endPage}
                  onChange={(e) => setEndPage(Math.min(totalPages, parseInt(e.target.value) || 1))}
                  className="input w-full text-sm py-2"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
              of {totalPages} pages · max {GUEST_MAX_PAGES} per request
            </p>
          </div>

          {/* Generate tools */}
          <div className="p-4 flex-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Generate with AI</p>
            <div className="space-y-2">
              {TOOLS.map(({ type, icon: Icon, label, desc }) => (
                <button
                  key={type}
                  onClick={() => handleGenerate(type)}
                  disabled={isBusy}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors flex-none">
                    <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto flex-none group-hover:text-primary-500 transition-colors" />
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Guest limits</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 leading-relaxed">
                Max {GUEST_MAX_PAGES} pages · 5 cards per generation · {MAX_FREE_ACTIONS} AI actions total
              </p>
              <Link href="/signup" className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium mt-2 hover:underline">
                Sign up for unlimited <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[78%] bg-primary-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <AssistantBubble key={msg.id} msg={msg} />
              )
            )}

            {isBusy && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center flex-none">
                  <BookOpen className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Mobile tool buttons */}
          <div className="md:hidden flex gap-2 px-4 py-2.5 overflow-x-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {TOOLS.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => handleGenerate(type)}
                disabled={isBusy}
                className="flex-none flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors disabled:opacity-50"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Input bar */}
          <div className="flex-none px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            {actionsRemaining <= 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-none" />
                <p className="text-sm text-red-600 dark:text-red-400 flex-1">You&apos;ve used all free actions.</p>
                <button
                  onClick={() => setShowGate(true)}
                  className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline flex-none"
                >
                  Sign up free →
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  placeholder={`Ask anything about pages ${startPage}–${endPage}…`}
                  rows={1}
                  className="flex-1 input resize-none text-sm py-3 min-h-[48px] max-h-36"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isBusy}
                  className="btn-primary px-4 py-3 flex-none"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
