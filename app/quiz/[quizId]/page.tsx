'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import MarkdownContent from '@/components/MarkdownContent'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Clock, CheckCircle,
  XCircle, Trophy, RefreshCw, BarChart3, AlertCircle, Timer
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { getScoreLabel, getScoreColor } from '@/lib/utils'
import type { Quiz, QuizQuestion, QuizAttempt } from '@/types/quiz'

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const router = useRouter()

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    attempt: QuizAttempt
    score: number
    total: number
    percentage: number
    weakTopics: string[]
    strongTopics: string[]
  } | null>(null)
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleSubmit = useCallback(async (forced = false) => {
    if (submitting) return
    if (!forced && Object.keys(answers).length < questions.length) {
      const unanswered = questions.length - Object.keys(answers).length
      if (!confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) return
    }

    setSubmitting(true)
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000)

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, answers, timeTaken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setResult(data)
      setSubmitted(true)
      if (timerRef.current) clearInterval(timerRef.current)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }, [submitting, answers, questions.length, quizId])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch(`/api/generate/quiz?quizId=${quizId}`)
      // Actually fetch from different endpoint
      const quizRes = await fetch(`/api/quiz/${quizId}`)

      // Since we don't have GET /api/quiz/[id], let's use a workaround
      // We'll store quiz in session or fetch from generate
      // For now, redirect if no quiz found
      setLoading(false)
    }
    // Actually let's fetch from supabase directly
    const fetchQuiz = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('user_id', user.id)
        .single()

      if (!quizData) { router.push('/dashboard'); return }
      setQuiz(quizData)

      const { data: questionData } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index')

      if (questionData) {
        const parsed = questionData.map((q) => ({
          ...q,
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
        }))
        setQuestions(parsed as QuizQuestion[])
      }

      if (quizData.time_limit) {
        setTimeLeft(quizData.time_limit * 60)
      }

      setLoading(false)
    }

    fetchQuiz()
    void init()
  }, [quizId, router])

  useEffect(() => {
    if (timeLeft === null || submitted) return
    if (timeLeft <= 0) {
      toast.error('Time is up! Auto-submitting...')
      handleSubmit(true)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timeLeft, submitted, handleSubmit])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions[currentIndex]
  const isAnswered = currentQuestion && answers[currentQuestion.id] !== undefined
  const answeredCount = Object.keys(answers).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!quiz) return null

  // Results Screen
  if (submitted && result) {
    const pct = result.percentage
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="font-semibold text-slate-900 dark:text-white">Quiz Results</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          {/* Score Card */}
          <div className="card p-8 text-center mb-6">
            <Trophy className={`w-16 h-16 mx-auto mb-4 ${pct >= 75 ? 'text-yellow-500' : 'text-slate-400'}`} />
            <div className={`text-6xl font-black mb-2 ${getScoreColor(pct)}`}>{pct}%</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white mb-1">{getScoreLabel(pct)}</div>
            <p className="text-slate-600 dark:text-slate-400">
              {result.score} correct out of {result.total} questions
            </p>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-2xl font-bold text-green-600">{result.score}</div>
                <div className="text-xs text-slate-500">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{result.total - result.score}</div>
                <div className="text-xs text-slate-500">Wrong</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{pct}%</div>
                <div className="text-xs text-slate-500">Score</div>
              </div>
            </div>
          </div>

          {/* Weak Topics */}
          {result.weakTopics.length > 0 && (
            <div className="card p-5 mb-4 border-l-4 border-red-400">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Topics to Review</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.weakTopics.map((topic) => (
                  <span key={topic} className="badge-red">{topic}</span>
                ))}
              </div>
            </div>
          )}

          {/* Strong Topics */}
          {result.strongTopics.length > 0 && (
            <div className="card p-5 mb-6 border-l-4 border-green-400">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Strong Topics</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.strongTopics.slice(0, 5).map((topic) => (
                  <span key={topic} className="badge-green">{topic}</span>
                ))}
              </div>
            </div>
          )}

          {/* Question Review */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Question Review</h3>
            <div className="space-y-4">
              {questions.map((q, i) => {
                const userAnswer = answers[q.id]
                const isCorrect = userAnswer?.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase()
                return (
                  <div key={q.id} className={`card p-4 border-l-4 ${isCorrect ? 'border-green-400' : 'border-red-400'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect
                        ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      }
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        Q{i + 1}. {q.question}
                      </p>
                    </div>
                    {!isCorrect && userAnswer && (
                      <p className="text-xs text-red-600 dark:text-red-400 ml-6 mb-1">
                        Your answer: {userAnswer}
                      </p>
                    )}
                    <p className="text-xs text-green-700 dark:text-green-400 ml-6 mb-2">
                      Correct: {q.correct_answer}
                    </p>
                    {q.explanation && (
                      <div className="ml-6 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setSubmitted(false); setAnswers({}); setCurrentIndex(0); setResult(null) }} className="btn-secondary gap-2">
              <RefreshCw className="w-4 h-4" /> Retake Quiz
            </button>
            <Link href="/dashboard" className="btn-primary gap-2">
              <BarChart3 className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Quiz Interface
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1 text-center">
            <h1 className="font-semibold text-slate-900 dark:text-white text-sm">{quiz.title}</h1>
            <p className="text-xs text-slate-500">{answeredCount}/{questions.length} answered</p>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold ${
              timeLeft < 60 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}>
              <Timer className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="max-w-3xl mx-auto mt-2">
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* View Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowAllQuestions(!showAllQuestions)}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            {showAllQuestions ? 'One at a time' : 'Show all questions'}
          </button>
        </div>

        {showAllQuestions ? (
          /* All Questions View */
          <div className="space-y-6">
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                answer={answers[q.id]}
                onAnswer={(ans) => setAnswers((prev) => ({ ...prev, [q.id]: ans }))}
                submitted={submitted}
              />
            ))}
          </div>
        ) : (
          /* One at a Time View */
          <div>
            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                index={currentIndex}
                answer={answers[currentQuestion.id]}
                onAnswer={(ans) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: ans }))}
                submitted={submitted}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="btn-secondary px-4 py-2.5 gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>

              {/* Question Dots */}
              <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                      i === currentIndex
                        ? 'bg-primary-600 text-white'
                        : answers[q.id]
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="btn-primary px-4 py-2.5 gap-2"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="btn-primary px-4 py-2.5"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    'Submit Quiz'
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {showAllQuestions && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="btn-primary px-8 py-3"
            >
              {submitting ? 'Submitting...' : `Submit Quiz (${answeredCount}/${questions.length} answered)`}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function QuestionCard({
  question,
  index,
  answer,
  onAnswer,
  submitted,
}: {
  question: QuizQuestion
  index: number
  answer?: string
  onAnswer: (ans: string) => void
  submitted: boolean
}) {
  const qType = question.question_type
  const isCorrect = answer?.trim().toLowerCase() === question.correct_answer?.trim().toLowerCase()

  return (
    <div className="card p-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="badge-primary flex-shrink-0">Q{index + 1}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-slate text-xs">{question.difficulty}</span>
            {question.topic && <span className="badge-slate text-xs">{question.topic}</span>}
            {question.page_number && <span className="badge-slate text-xs">Page {question.page_number}</span>}
          </div>
          <p className="font-medium text-slate-900 dark:text-white leading-relaxed">{question.question}</p>
        </div>
      </div>

      {/* MCQ Options */}
      {(qType === 'mcq' || qType === 'true_false') && question.options && Array.isArray(question.options) && (
        <div className="space-y-2">
          {question.options.map((option: string, i: number) => {
            const label = String.fromCharCode(65 + i)
            const optionText = option.startsWith(label + '.') || option.startsWith(label + ')') ? option : `${label}. ${option}`
            const isSelected = answer === option
            const isThisCorrect = option.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()

            return (
              <button
                key={i}
                onClick={() => !submitted && onAnswer(option)}
                disabled={submitted}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  submitted
                    ? isThisCorrect
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                      : isSelected
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                    : isSelected
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 text-primary-800 dark:text-primary-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-sm">{optionText}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Fill in blank / Short / Long / Viva */}
      {(qType === 'fill_blank' || qType === 'short_answer' || qType === 'long_answer' || qType === 'viva') && (
        <div>
          {qType === 'long_answer' ? (
            <textarea
              className="input resize-none h-24"
              placeholder="Type your answer here..."
              value={answer || ''}
              onChange={(e) => onAnswer(e.target.value)}
              disabled={submitted}
            />
          ) : (
            <input
              type="text"
              className="input"
              placeholder="Type your answer..."
              value={answer || ''}
              onChange={(e) => onAnswer(e.target.value)}
              disabled={submitted}
            />
          )}
        </div>
      )}

      {/* Answer feedback */}
      {submitted && answer && (
        <div className={`mt-4 p-3 rounded-xl text-sm ${
          isCorrect ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {isCorrect
              ? <CheckCircle className="w-4 h-4 text-green-600" />
              : <XCircle className="w-4 h-4 text-red-500" />
            }
            <span className={`font-medium text-sm ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isCorrect ? 'Correct!' : `Correct answer: ${question.correct_answer}`}
            </span>
          </div>
          {question.explanation && (
            <div className="prose-studymate text-xs mt-2 text-slate-600 dark:text-slate-400">
              <MarkdownContent>{question.explanation}</MarkdownContent>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
