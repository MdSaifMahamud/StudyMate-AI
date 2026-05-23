// ================================================
// StudyMate AI - PDF Processing Service
// Handles text extraction, chunking, and search
// ================================================

import { supabaseAdmin } from './supabase-server'
import { buildPageRangeContext } from './utils'

export interface ExtractedPage {
  pageNumber: number
  text: string
  charCount: number
}

export interface ExtractionResult {
  pages: ExtractedPage[]
  totalPages: number
  totalChars: number
  hasText: boolean
}

export async function extractPDFText(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // Dynamic import to avoid build issues
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)

    const rawText = data.text
    const totalPages = data.numpages

    if (!rawText || rawText.trim().length === 0) {
      return {
        pages: [],
        totalPages,
        totalChars: 0,
        hasText: false,
      }
    }

    // pdf-parse gives us all text concatenated; we split by page markers
    // For reliable per-page extraction, we parse each page individually
    const pages: ExtractedPage[] = []

    // Try to extract per-page using page render callbacks
    const perPageTexts = await extractPerPage(buffer, totalPages)

    for (let i = 0; i < totalPages; i++) {
      const pageText = perPageTexts[i] || ''
      pages.push({
        pageNumber: i + 1,
        text: cleanText(pageText),
        charCount: pageText.length,
      })
    }

    return {
      pages,
      totalPages,
      totalChars: rawText.length,
      hasText: true,
    }
  } catch (error) {
    throw new Error(`PDF extraction failed: ${(error as Error).message}`)
  }
}

async function extractPerPage(buffer: Buffer, totalPages: number): Promise<string[]> {
  const pdfParse = (await import('pdf-parse')).default
  const perPageTexts: string[] = Array(totalPages).fill('')
  let currentPage = 0

  try {
    await pdfParse(buffer, {
      pagerender: (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string; hasEOL?: boolean }> }> }) => {
        return pageData.getTextContent().then((textContent) => {
          const pageIndex = currentPage
          currentPage++
          const text = textContent.items
            .map((item) => item.str + (item.hasEOL ? '\n' : ' '))
            .join('')
          if (pageIndex < totalPages) {
            perPageTexts[pageIndex] = text
          }
          return text
        })
      },
    })
  } catch {
    // Fallback: split all text roughly by page count
    const allData = await pdfParse(buffer)
    const allText = allData.text
    const charsPerPage = Math.ceil(allText.length / totalPages)
    for (let i = 0; i < totalPages; i++) {
      perPageTexts[i] = allText.slice(i * charsPerPage, (i + 1) * charsPerPage)
    }
  }

  return perPageTexts
}

function cleanText(text: string): string {
  return text
    .replace(/\x00/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[ \t]{3,}/g, '  ')
    .trim()
}

export async function savePDFPages(pdfId: string, pages: ExtractedPage[]): Promise<void> {
  const BATCH_SIZE = 50
  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE)
    const { error } = await supabaseAdmin.from('pdf_pages').upsert(
      batch.map((p) => ({
        pdf_id: pdfId,
        page_number: p.pageNumber,
        extracted_text: p.text,
      })),
      { onConflict: 'pdf_id,page_number' }
    )
    if (error) throw new Error(`Failed to save pages: ${error.message}`)
  }
}

export async function getPageRange(
  pdfId: string,
  startPage: number,
  endPage: number
): Promise<{ page_number: number; extracted_text: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('pdf_pages')
    .select('page_number, extracted_text')
    .eq('pdf_id', pdfId)
    .gte('page_number', startPage)
    .lte('page_number', endPage)
    .order('page_number', { ascending: true })

  if (error) throw new Error(`Failed to fetch pages: ${error.message}`)
  return data || []
}

export async function buildContext(
  pdfId: string,
  startPage: number,
  endPage: number,
  maxChars: number = 100000
): Promise<string> {
  const pages = await getPageRange(pdfId, startPage, endPage)

  if (pages.length === 0) {
    throw new Error('No text content found in the selected page range.')
  }

  const fullContext = buildPageRangeContext(pages)

  if (fullContext.length <= maxChars) return fullContext

  // Truncate gracefully if context is too large
  const truncated = fullContext.substring(0, maxChars)
  const lastNewline = truncated.lastIndexOf('\n')
  return truncated.substring(0, lastNewline) + '\n\n[Content truncated — select a smaller page range for complete analysis]'
}

export async function searchInPDF(
  pdfId: string,
  keyword: string,
  maxResults: number = 10
): Promise<{ page_number: number; snippet: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('pdf_pages')
    .select('page_number, extracted_text')
    .eq('pdf_id', pdfId)
    .ilike('extracted_text', `%${keyword}%`)
    .order('page_number', { ascending: true })
    .limit(maxResults)

  if (error) throw new Error(`Search failed: ${error.message}`)

  return (data || []).map((page) => {
    const idx = page.extracted_text.toLowerCase().indexOf(keyword.toLowerCase())
    const start = Math.max(0, idx - 100)
    const end = Math.min(page.extracted_text.length, idx + keyword.length + 100)
    const snippet = page.extracted_text.substring(start, end).trim()
    return {
      page_number: page.page_number,
      snippet: (start > 0 ? '...' : '') + snippet + (end < page.extracted_text.length ? '...' : ''),
    }
  })
}

export function detectScannedPDF(pages: ExtractedPage[]): boolean {
  const totalChars = pages.reduce((sum, p) => sum + p.charCount, 0)
  const avgCharsPerPage = totalChars / (pages.length || 1)
  return avgCharsPerPage < 50
}

export async function uploadPDFToStorage(
  userId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${userId}/${Date.now()}_${sanitizedName}`

  const { error } = await supabaseAdmin.storage
    .from('pdfs')
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabaseAdmin.storage.from('pdfs').getPublicUrl(storagePath)
  return data.publicUrl
}

export async function deletePDFFromStorage(fileUrl: string): Promise<void> {
  const urlParts = fileUrl.split('/storage/v1/object/public/pdfs/')
  if (urlParts.length < 2) return
  const storagePath = urlParts[1]
  await supabaseAdmin.storage.from('pdfs').remove([storagePath])
}
