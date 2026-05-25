'use client'

import Link from 'next/link'
import { CheckCircle, ArrowRight, BookOpen, Sparkles, X } from 'lucide-react'

interface GuestAuthGateProps {
  actionsUsed: number
  maxActions: number
  onDismiss?: () => void
}

const benefits = [
  'Unlimited AI chats, quizzes & flashcards',
  'Save all study materials and track progress',
  'Exam mode with timer and score analysis',
  'Upload and manage unlimited PDFs',
  'Identify weak topics and improvement trends',
]

export default function GuestAuthGate({ actionsUsed, maxActions, onDismiss }: GuestAuthGateProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" />

      <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        {/* Gradient top bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-600" />

        <div className="p-8">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">StudyMate AI</span>
          </div>

          {/* Achievement pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-full text-sm font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            You used {actionsUsed} of {maxActions} free AI actions
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Ready to unlock everything?
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
            You just experienced real AI-powered studying. Create your free account to continue — no credit card needed.
          </p>

          {/* Benefits */}
          <ul className="space-y-2.5 mb-7">
            {benefits.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-none" />
                <span className="text-sm text-slate-600 dark:text-slate-300">{item}</span>
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Link
              href="/signup"
              className="btn-primary w-full justify-center py-3 text-base"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="btn-outline w-full justify-center py-3 text-base"
            >
              Log In to Existing Account
            </Link>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5">
            Free forever · No credit card · Setup in 30 seconds
          </p>
        </div>
      </div>
    </div>
  )
}
