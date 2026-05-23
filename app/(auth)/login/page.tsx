'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Eye, EyeOff, LogIn, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please fill in all fields.')

    setLoading(true)
    setNeedsConfirmation(false)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        // Supabase returns different messages depending on version
        const msg = error.message.toLowerCase()
        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
          setNeedsConfirmation(true)
          return
        }
        if (msg.includes('invalid login credentials') ||
            msg.includes('invalid email or password') ||
            msg.includes('invalid credentials')) {
          toast.error('Wrong email or password. Please try again.')
          return
        }
        throw error
      }
      if (data.session) {
        toast.success('Welcome back!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) toast.error('Could not resend email: ' + error.message)
    else toast.success('Confirmation email resent! Check your inbox.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-slate-900 dark:text-white">StudyMate AI</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Sign in to continue studying</p>
        </div>

        {/* Email confirmation banner */}
        {needsConfirmation && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300 text-sm">Email not confirmed</p>
                <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">
                  Check your inbox for a confirmation link, then try logging in again.
                </p>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  className="text-xs text-yellow-700 dark:text-yellow-400 underline mt-2 hover:no-underline"
                >
                  Resend confirmation email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link href="#" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-3"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              Create one free
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
