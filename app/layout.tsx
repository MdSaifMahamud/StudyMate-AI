import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'StudyMate AI — Your Personal PDF Study Assistant',
  description:
    'Upload any PDF, select page ranges, and let AI generate explanations, flashcards, quizzes, and cheat sheets for exam preparation.',
  keywords: ['study assistant', 'PDF tutor', 'AI flashcards', 'exam prep', 'quiz generator'],
  authors: [{ name: 'StudyMate AI' }],
  openGraph: {
    title: 'StudyMate AI',
    description: 'AI-powered PDF study assistant for students',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#6366f1', secondary: 'white' },
            },
          }}
        />
      </body>
    </html>
  )
}
