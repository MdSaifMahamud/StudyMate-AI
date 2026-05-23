'use client'

import Link from 'next/link'
import {
  BookOpen, Brain, FileText, Zap, Star, CheckCircle,
  ArrowRight, Upload, MessageSquare, BarChart3, Target,
  Sparkles, GraduationCap, Clock, Award
} from 'lucide-react'

const features = [
  {
    icon: MessageSquare,
    title: 'AI Chatbot',
    description: 'Ask questions about selected PDF pages. Get student-friendly answers with page references.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: BookOpen,
    title: 'Flashcard Generator',
    description: 'Auto-generate flashcards from any page range. Study with interactive flip cards.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: FileText,
    title: 'Cheat Sheets',
    description: 'Create printable cheat sheets with key definitions, formulas, and exam points.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Target,
    title: 'Quiz Generator',
    description: 'Generate MCQs, True/False, and more with adjustable difficulty levels.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: Zap,
    title: 'Exam Mode',
    description: 'Timed mock exams with score reports, weak topic analysis, and AI advice.',
    color: 'bg-yellow-100 text-yellow-600',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    description: 'Track sessions, quiz scores, flashcard progress, and identify weak areas.',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    icon: Brain,
    title: 'Study Plans',
    description: 'AI-generated day-by-day study plans based on your exam date and schedule.',
    color: 'bg-cyan-100 text-cyan-600',
  },
  {
    icon: Sparkles,
    title: 'Tutor Modes',
    description: 'Switch between Simple, Exam Coach, Socratic, Revision, and Bangla modes.',
    color: 'bg-indigo-100 text-indigo-600',
  },
]

const steps = [
  { step: '01', title: 'Upload PDF', desc: 'Upload any textbook, lecture slides, or study material in PDF format.' },
  { step: '02', title: 'Select Pages', desc: 'Choose a specific page range to focus your study session.' },
  { step: '03', title: 'Choose Tools', desc: 'Chat, generate flashcards, quizzes, cheat sheets, or explanations.' },
  { step: '04', title: 'Study & Track', desc: 'Study smart, take quizzes, and track your progress over time.' },
]

const stats = [
  { icon: GraduationCap, value: '10+', label: 'Study Tools' },
  { icon: Clock, value: '60s', label: 'To Generate Quiz' },
  { icon: Award, value: '100%', label: 'PDF-Grounded AI' },
  { icon: Star, value: 'Free', label: 'To Get Started' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 dark:text-white">StudyMate AI</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="btn-secondary text-sm px-4 py-2">
                Log In
              </Link>
              <Link href="/signup" className="btn-primary text-sm px-4 py-2">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 -z-10" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-100/50 dark:bg-primary-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 -z-10" />

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm font-medium mb-6 border border-primary-200 dark:border-primary-800">
            <Sparkles className="w-4 h-4" />
            AI-Powered PDF Study Assistant
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
            Study Smarter with{' '}
            <span className="gradient-text">AI-Powered</span>
            <br />
            PDF Learning
          </h1>

          <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            Upload any PDF, select a page range, and let AI generate explanations, flashcards, cheat sheets, and quizzes — all grounded in your document. No hallucinations. No guessing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/signup" className="btn-primary text-base px-8 py-3.5 shadow-lg shadow-primary-200 dark:shadow-primary-900/50">
              Start Studying Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="btn-outline text-base px-8 py-3.5">
              I already have an account
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center p-4 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400 mb-2" />
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">How It Works</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">Four simple steps to smarter studying</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="card p-6 h-full">
                  <div className="text-5xl font-black text-primary-100 dark:text-primary-900 mb-3">{step}</div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
                {step !== '04' && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Everything You Need to Ace Exams</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              StudyMate AI combines all your study tools in one place — powered by cutting-edge AI that only uses your PDF content.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, description, color }) => (
              <div key={title} className="card p-6 hover:shadow-md transition-shadow group">
                <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="py-24 px-4 bg-gradient-to-br from-primary-600 to-primary-800 dark:from-primary-900 dark:to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Why StudyMate AI is Different</h2>
          <p className="text-primary-200 text-lg mb-12">Not just a chatbot — a complete exam preparation system</p>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {[
              'Page-range based study — focus on exactly what matters',
              'AI answers only from YOUR PDF — no hallucinations',
              'Automatic citation of page numbers in every answer',
              'Flashcards, quizzes, and cheat sheets in one click',
              'Multiple difficulty levels for progressive learning',
              'Exam mode with timer and detailed score reports',
              'Bangla + English bilingual support for local students',
              'Study plans tailored to your exam date and schedule',
            ].map((point) => (
              <div key={point} className="flex items-start gap-3 bg-white/10 rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-white text-sm leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Upload className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Ready to Transform How You Study?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Upload your first PDF and start generating study materials in under a minute.
          </p>
          <Link href="/signup" className="btn-primary text-base px-10 py-4 shadow-lg shadow-primary-200 dark:shadow-primary-900/50">
            Get Started — It&apos;s Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">StudyMate AI</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Built for students, by students. Study smarter, not harder.
          </p>
        </div>
      </footer>
    </div>
  )
}
