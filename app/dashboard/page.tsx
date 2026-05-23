'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, Upload, Plus, Trash2, FileText, Clock, CheckCircle,
  AlertCircle, LogOut, BarChart3, ArrowRight, Brain, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatFileSize, formatDate } from '@/lib/utils'
import type { PDF } from '@/types/pdf'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; user_metadata?: { name?: string } } | null>(null)
  const [pdfs, setPdfs] = useState<PDF[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPDFs = useCallback(async () => {
    const res = await fetch('/api/pdf/list')
    const data = await res.json()
    if (data.pdfs) setPdfs(data.pdfs)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)
      await fetchPDFs()
      setLoading(false)
    }
    init()
  }, [router, fetchPDFs])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') return toast.error('Please upload a PDF file.')
    if (file.size > 50 * 1024 * 1024) return toast.error('File size must be under 50MB.')

    setUploading(true)
    const toastId = toast.loading(`Uploading ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/pdf/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      toast.success(data.message || 'PDF uploaded successfully!', { id: toastId })
      await fetchPDFs()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      toast.error(msg, { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (pdfId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This will remove all study sessions, flashcards, and quizzes.`)) return

    setDeletingId(pdfId)
    try {
      const res = await fetch(`/api/pdf/${pdfId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setPdfs((prev) => prev.filter((p) => p.id !== pdfId))
      toast.success('PDF deleted.')
    } catch {
      toast.error('Failed to delete PDF.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const filteredPdfs = pdfs.filter((p) =>
    p.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusIcon = (status: string) => {
    if (status === 'ready') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'processing') return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />
    return <AlertCircle className="w-4 h-4 text-red-500" />
  }

  const statusLabel = (status: string) => {
    if (status === 'ready') return <span className="badge-green">Ready</span>
    if (status === 'processing') return <span className="badge-yellow">Processing</span>
    return <span className="badge-red">Failed</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">StudyMate AI</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/progress" className="btn-secondary text-sm px-3 py-2 gap-1.5">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Progress</span>
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-xl">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user?.user_metadata?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
                  {user?.user_metadata?.name || user?.email?.split('@')[0]}
                </span>
              </div>
              <button onClick={handleLogout} className="btn-outline text-sm px-3 py-2 gap-1.5">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Welcome back, {user?.user_metadata?.name?.split(' ')[0] || 'Student'} 👋
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {pdfs.filter((p) => p.status === 'ready').length} PDFs ready to study
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total PDFs', value: pdfs.length, icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Ready to Study', value: pdfs.filter((p) => p.status === 'ready').length, icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
            { label: 'Processing', value: pdfs.filter((p) => p.status === 'processing').length, icon: Clock, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'Total Pages', value: pdfs.reduce((s, p) => s + p.total_pages, 0), icon: BookOpen, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        {pdfs.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search your PDFs..."
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* PDF List */}
        {filteredPdfs.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {searchQuery ? 'No PDFs match your search' : 'Upload your first PDF'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              {searchQuery
                ? 'Try a different search term.'
                : 'Upload any textbook, lecture slides, or study material to get started.'}
            </p>
            {!searchQuery && (
              <button onClick={() => fileInputRef.current?.click()} className="btn-primary mx-auto">
                <Plus className="w-4 h-4" />
                Upload First PDF
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPdfs.map((pdf) => (
              <div key={pdf.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{pdf.file_name}</h3>
                      {statusLabel(pdf.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        {statusIcon(pdf.status)}
                        {pdf.total_pages} pages
                      </span>
                      <span>{formatFileSize(pdf.file_size)}</span>
                      <span>{formatDate(pdf.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {pdf.status === 'ready' && (
                      <Link
                        href={`/study/${pdf.id}`}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        <Brain className="w-4 h-4" />
                        Study
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(pdf.id, pdf.file_name)}
                      disabled={deletingId === pdf.id}
                      className="btn-outline text-sm px-3 py-2 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                    >
                      {deletingId === pdf.id ? (
                        <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
