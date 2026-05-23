'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, BarChart3, BookOpen, Brain, FileText,
  Target, TrendingUp, AlertCircle, CheckCircle, Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getScoreColor, getScoreLabel } from '@/lib/utils'

interface ProgressStats {
  totalPDFs: number
  totalSessions: number
  totalFlashcards: number
  totalQuizzes: number
  averageScore: number
  weakTopics: string[]
  recentAttempts: Array<{
    id: string
    score: number
    total: number
    percentage: number
    completed_at: string
  }>
}

export default function ProgressPage() {
  const router = useRouter()
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch('/api/progress')
      const data = await res.json()
      if (data.stats) setStats(data.stats)
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    { label: 'PDFs Uploaded', value: stats.totalPDFs, icon: FileText, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
    { label: 'Study Sessions', value: stats.totalSessions, icon: BookOpen, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
    { label: 'Flashcards Made', value: stats.totalFlashcards, icon: Brain, color: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' },
    { label: 'Quizzes Taken', value: stats.totalQuizzes, icon: Target, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Link>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h1 className="font-semibold text-slate-900 dark:text-white">Progress Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-0.5">{value}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Average Score */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Overall Performance</h2>
            </div>
            {stats.totalQuizzes === 0 ? (
              <div className="text-center py-6">
                <Target className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No quizzes taken yet</p>
                <Link href="/dashboard" className="btn-primary text-sm mt-3 inline-flex">
                  Start Studying
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className={`text-5xl font-black mb-1 ${getScoreColor(stats.averageScore)}`}>
                    {stats.averageScore}%
                  </div>
                  <p className={`font-medium ${getScoreColor(stats.averageScore)}`}>
                    {getScoreLabel(stats.averageScore)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Average quiz score</p>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.averageScore}%`,
                      background: stats.averageScore >= 75 ? '#22c55e' : stats.averageScore >= 50 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Weak Topics */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Topics to Review</h2>
            </div>
            {stats.weakTopics.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {stats.totalQuizzes === 0
                    ? 'Take a quiz to identify weak topics'
                    : 'No weak topics identified — great work!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.weakTopics.map((topic, i) => (
                  <div key={topic} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl">
                    <span className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{topic}</span>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  </div>
                ))}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Review these topics and take targeted quizzes to improve.
                </p>
              </div>
            )}
          </div>

          {/* Recent Quiz Attempts */}
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Recent Quiz Attempts</h2>
            </div>
            {stats.recentAttempts.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No quiz attempts yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      attempt.percentage >= 75 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      attempt.percentage >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {attempt.percentage}%
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {attempt.score}/{attempt.total} correct
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(attempt.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${attempt.percentage}%`,
                          background: attempt.percentage >= 75 ? '#22c55e' : attempt.percentage >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 card p-6 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/10 dark:to-accent-900/10 border-primary-200 dark:border-primary-800">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Study Tips Based on Your Progress</h3>
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            {stats.totalPDFs === 0 && (
              <li className="flex items-start gap-2">
                <span className="text-primary-500 font-bold mt-0.5">→</span>
                Upload your first PDF to get started with AI-powered studying.
              </li>
            )}
            {stats.totalQuizzes === 0 && stats.totalPDFs > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-primary-500 font-bold mt-0.5">→</span>
                Generate your first quiz from any PDF to test your knowledge.
              </li>
            )}
            {stats.averageScore < 50 && stats.totalQuizzes > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-primary-500 font-bold mt-0.5">→</span>
                Your average score is below 50%. Focus on the weak topics listed above and try easier difficulty first.
              </li>
            )}
            {stats.averageScore >= 75 && stats.totalQuizzes > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-primary-500 font-bold mt-0.5">→</span>
                Excellent performance! Try harder difficulty quizzes to challenge yourself further.
              </li>
            )}
            {stats.totalFlashcards === 0 && stats.totalPDFs > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-primary-500 font-bold mt-0.5">→</span>
                Try generating flashcards for quick revision. They&apos;re great for memorizing key terms.
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-primary-500 font-bold mt-0.5">→</span>
              Consistency is key. Study a little every day rather than cramming before exams.
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
