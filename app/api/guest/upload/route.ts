import { NextRequest, NextResponse } from 'next/server'
import { extractPDFText } from '@/lib/pdfService'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted.' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds the 20 MB limit.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await extractPDFText(buffer)

    if (!result.hasText || result.pages.length === 0) {
      return NextResponse.json(
        { error: 'No readable text found. This PDF may be scanned or image-based.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      fileName: file.name,
      totalPages: result.totalPages,
      pages: result.pages.map((p) => ({
        page_number: p.pageNumber,
        extracted_text: p.text,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
