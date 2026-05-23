'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Calendar, Clock, Target, Loader2, Sparkles, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { PDF } from '@/types/pdf'

export default function StudyPlanPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <StudyPlanPage />
    </Suspense>
  )
}

function StudyPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pdfIdParam = searchParams.get('pdfId')

  const [pdfs, setPdfs] = useState<PDF[]>([])
  const [selectedPdfId, setSelectedPdfId] = useState(pdfIdParam || '')
  const [examDate, setExamDate] = useState('')
  const [dailyHours, setDailyHours] = useState(2)
  const [preparationLevel, setPreparationLevel] = useState('beginner')
  const [targetScore, setTargetScore] = useState(80)
  const [startPage, setStartPage] = useState(1)
  const [endPage, setEndPage] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch('/api/pdf/list')
      const data = await res.json()
      if (data.pdfs) {
        const readyPdfs = data.pdfs.filter((p: PDF) => p.status === 'ready')
        setPdfs(readyPdfs)
        if (pdfIdParam) {
          const selected = readyPdfs.find((p: PDF) => p.id === pdfIdParam)
          if (selected) setEndPage(selected.total_pages)
        }
      }
      setLoading(false)
    }
    init()
  }, [router, pdfIdParam])

  const handlePdfChange = (pdfId: string) => {
    setSelectedPdfId(pdfId)
    const pdf = pdfs.find((p) => p.id === pdfId)
    if (pdf) { setStartPage(1); setEndPage(pdf.total_pages) }
  }

  const handleGenerate = async () => {
    if (!selectedPdfId) return toast.error('Please select a PDF.')
    if (!examDate) return toast.error('Please set your exam date.')
    if (new Date(examDate) <= new Date()) return toast.error('Exam date must be in the future.')

    setGenerating(true)
    setPlan('')
    try {
      const res = await fetch('/api/generate/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfId: selectedPdfId,
          startPage,
          endPage,
          examDate,
          dailyHours,
          preparationLevel,
          targetScore,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlan(data.plan.plan_content)
      toast.success('Study plan generated!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const selectedPdf = pdfs.find((p) => p.id === selectedPdfId)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Link>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h1 className="font-semibold text-slate-900 dark:text-white">Study Plan Generator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-5">Plan Details</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Select PDF</label>
                <select
                  className="input"
                  value={selectedPdfId}
                  onChange={(e) => handlePdfChange(e.target.value)}
                >
                  <option value="">Choose a PDF...</option>
                  {pdfs.map((pdf) => (
                    <option key={pdf.id} value={pdf.id}>
                      {pdf.file_name} ({pdf.total_pages} pages)
                    </option>
                  ))}
                </select>
              </div>

              {selectedPdf && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Start Page</label>
                    <input
                      type="number"
                      className="input"
                      min={1}
                      max={selectedPdf.total_pages}
                      value={startPage}
                      onChange={(e) => setStartPage(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">End Page</label>
                    <input
                      type="number"
                      className="input"
                      min={1}
                      max={selectedPdf.total_pages}
                      value={endPage}
                      onChange={(e) => setEndPage(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="label flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Exam Date
                </label>
                <input
                  type="date"
                  className="input"
                  min={today}
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Daily Study Hours: {dailyHours}h
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>30 min</span><span>8 hrs</span>
                </div>
              </div>

              <div>
                <label className="label">Current Preparation Level</label>
                <select
                  className="input"
                  value={preparationLevel}
                  onChange={(e) => setPreparationLevel(e.target.value)}
                >
                  <option value="beginner">Beginner — Just starting out</option>
                  <option value="medium">Medium — Some knowledge</option>
                  <option value="advanced">Advanced — Well prepared</option>
                </select>
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Target Score: {targetScore}%
                </label>
                <input
                  type="range"
                  min={40}
                  max={100}
                  step={5}
                  value={targetScore}
                  onChange={(e) => setTargetScore(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>40%</span><span>100%</span>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !selectedPdfId || !examDate}
                className="btn-primary w-full py-3"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating Plan...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Study Plan</>
                )}
              </button>
            </div>
          </div>

          {/* Plan Output */}
          <div className="card p-6">
            {plan ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-900 dark:text-white">Your Study Plan</h2>
                  <button
                    onClick={() => { navigator.clipboard.writeText(plan); toast.success('Copied!') }}
                    className="btn-outline text-xs px-3 py-2"
                  >
                    Copy
                  </button>
                </div>
                <div className="prose-studymate text-sm max-h-[600px] overflow-y-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center min-h-[300px]">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  Your personalized plan will appear here
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                  Fill in your details and click Generate to get a day-by-day study plan tailored to your exam date.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
