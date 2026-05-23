import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export function extractJSON<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as T
    }
    const startIndex = text.indexOf('[')
    const endIndex = text.lastIndexOf(']')
    if (startIndex !== -1 && endIndex !== -1) {
      return JSON.parse(text.substring(startIndex, endIndex + 1)) as T
    }
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export function buildPageRangeContext(pages: { page_number: number; extracted_text: string }[]): string {
  return pages
    .map((p) => `--- Page ${p.page_number} ---\n${p.extracted_text}`)
    .join('\n\n')
}

export function validatePageRange(
  start: number,
  end: number,
  totalPages: number
): { valid: boolean; error?: string } {
  if (start < 1) return { valid: false, error: 'Start page cannot be less than 1' }
  if (end > totalPages) return { valid: false, error: `End page cannot exceed total pages (${totalPages})` }
  if (start > end) return { valid: false, error: 'Start page cannot be greater than end page' }
  if (end - start >= 50) return { valid: false, error: 'Please select 50 pages or fewer per request.' }
  return { valid: true }
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

export function getScoreLabel(percentage: number): string {
  if (percentage >= 90) return 'Excellent'
  if (percentage >= 75) return 'Good'
  if (percentage >= 60) return 'Satisfactory'
  if (percentage >= 40) return 'Needs Improvement'
  return 'Needs More Study'
}

export function getScoreColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600'
  if (percentage >= 75) return 'text-blue-600'
  if (percentage >= 60) return 'text-yellow-600'
  if (percentage >= 40) return 'text-orange-600'
  return 'text-red-600'
}
