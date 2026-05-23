'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, RotateCcw, CheckCircle, AlertTriangle,
  BookOpen, ArrowLeft, RefreshCw, Download, Trophy
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { Flashcard, FlashcardSet } from '@/types/flashcard'

export default function FlashcardsPage() {
  const { setId } = useParams<{ setId: string }>()
  const router = useRouter()

  const [set, setSet] = useState<FlashcardSet | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'difficult' | 'new'>('all')

  const loadSet = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const res = await fetch(`/api/flashcards?setId=${setId}`)
    const data = await res.json()
    if (!res.ok || !data.set) { router.push('/dashboard'); return }

    setSet(data.set)
    setCards(data.set.flashcards || [])
    setLoading(false)
  }, [setId, router])

  useEffect(() => { loadSet() }, [loadSet])

  const filteredCards = cards.filter((c) => {
    if (filter === 'difficult') return c.status === 'difficult'
    if (filter === 'new') return c.status === 'new' || c.status === undefined
    return true
  })

  const currentCard = filteredCards[currentIndex]
  const knownCount = cards.filter((c) => c.status === 'known').length
  const difficultCount = cards.filter((c) => c.status === 'difficult').length
  const progress = cards.length > 0 ? Math.round((knownCount / cards.length) * 100) : 0

  const handleStatus = async (status: 'known' | 'difficult') => {
    if (!currentCard) return

    const res = await fetch('/api/flashcards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: currentCard.id, status }),
    })

    if (res.ok) {
      setCards((prev) => prev.map((c) => (c.id === currentCard.id ? { ...c, status } : c)))
      if (status === 'known') toast.success('Marked as Known!')
      else toast('Marked as Difficult', { icon: '⚠️' })
      handleNext()
    }
  }

  const handleNext = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredCards.length)
    }, 150)
  }

  const handlePrev = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length)
    }, 150)
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setFilter('all')
  }

  const exportCSV = () => {
    const csv = [
      ['Front', 'Back', 'Page', 'Topic', 'Difficulty'],
      ...cards.map((c) => [c.front_text, c.back_text, c.page_number || '', c.topic || '', c.difficulty]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${set?.title || 'flashcards'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported as CSV!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!set || cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No flashcards found.</p>
          <Link href="/dashboard" className="btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const isDone = knownCount === cards.length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Dashboard</span>
          </Link>
          <div className="text-center">
            <h1 className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[200px]">{set.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{cards.length} cards total</p>
          </div>
          <button onClick={exportCSV} className="btn-outline text-xs px-3 py-2 gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-600 dark:text-slate-400">
              Card {filteredCards.length > 0 ? currentIndex + 1 : 0} of {filteredCards.length}
            </span>
            <div className="flex items-center gap-3">
              <span className="badge-green">Known: {knownCount}</span>
              <span className="badge-red">Difficult: {difficultCount}</span>
            </div>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">{progress}% mastered</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: 'all', label: `All (${cards.length})` },
            { id: 'difficult', label: `Difficult (${difficultCount})` },
            { id: 'new', label: `New (${cards.length - knownCount - difficultCount})` },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setFilter(id); setCurrentIndex(0); setIsFlipped(false) }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                filter === id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isDone ? (
          /* Completion Screen */
          <div className="card p-12 text-center">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">All Cards Mastered!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              You&apos;ve marked all {cards.length} flashcards as known. Great work!
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={handleReset} className="btn-secondary gap-2">
                <RefreshCw className="w-4 h-4" />
                Study Again
              </button>
              <Link href="/dashboard" className="btn-primary">
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">No cards in this filter.</p>
            <button onClick={() => setFilter('all')} className="btn-secondary">Show All Cards</button>
          </div>
        ) : (
          <>
            {/* Flashcard */}
            <div className="flashcard-container mb-6" style={{ height: '320px' }}>
              <div
                className={`flashcard-inner w-full h-full cursor-pointer ${isFlipped ? 'flipped' : ''}`}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {/* Front */}
                <div className="flashcard-front card flex flex-col items-center justify-center p-8 text-center">
                  <div className="badge-primary mb-4">
                    {currentCard?.difficulty?.toUpperCase() || 'MEDIUM'}
                  </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {currentCard?.front_text}
                  </p>
                  {currentCard?.page_number && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">Page {currentCard.page_number}</p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Click to reveal answer</p>
                </div>

                {/* Back */}
                <div className="flashcard-back card bg-primary-50 dark:bg-primary-900/20 flex flex-col items-center justify-center p-8 text-center border-primary-200 dark:border-primary-800">
                  <div className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mb-4">
                    ANSWER
                  </div>
                  <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentCard?.back_text}
                  </p>
                  {currentCard?.topic && (
                    <span className="badge-slate mt-4">{currentCard.topic}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={handlePrev} className="btn-secondary px-4 py-2.5 gap-2">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => handleStatus('difficult')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Difficult
                </button>
                <button
                  onClick={() => handleStatus('known')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Known
                </button>
              </div>

              <button onClick={handleNext} className="btn-secondary px-4 py-2.5 gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Flip hint */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 hover:text-primary-600"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isFlipped ? 'Show question' : 'Show answer'}
              </button>
            </div>
          </>
        )}

        {/* Card List Preview */}
        {cards.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">All Cards</h3>
            <div className="space-y-2">
              {cards.map((card, i) => (
                <button
                  key={card.id}
                  onClick={() => { setCurrentIndex(filteredCards.findIndex((c) => c.id === card.id)); setIsFlipped(false) }}
                  className={`w-full text-left card p-3 hover:shadow-md transition-shadow ${i === currentIndex ? 'border-primary-300 dark:border-primary-700' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      card.status === 'known' ? 'bg-green-100 dark:bg-green-900/30' :
                      card.status === 'difficult' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-slate-700'
                    }`}>
                      {card.status === 'known' ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> :
                       card.status === 'difficult' ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> :
                       <BookOpen className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{card.front_text}</p>
                    {card.page_number && (
                      <span className="badge-slate ml-auto flex-shrink-0 text-xs">P{card.page_number}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
