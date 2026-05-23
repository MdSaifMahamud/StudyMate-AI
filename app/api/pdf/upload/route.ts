import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import {
  extractPDFText,
  savePDFPages,
  uploadPDFToStorage,
  detectScannedPDF,
} from '@/lib/pdfService'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Create PDF record with processing status
    const { data: pdfRecord, error: insertError } = await supabaseAdmin
      .from('pdfs')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_url: '',
        file_size: file.size,
        total_pages: 0,
        status: 'processing',
      })
      .select()
      .single()

    if (insertError || !pdfRecord) {
      return NextResponse.json({ error: 'Failed to create PDF record.' }, { status: 500 })
    }

    try {
      // Upload to Supabase Storage
      const fileUrl = await uploadPDFToStorage(user.id, file.name, buffer, file.type)

      // Extract text from PDF
      const { pages, totalPages, hasText } = await extractPDFText(buffer)

      if (!hasText || detectScannedPDF(pages)) {
        await supabaseAdmin
          .from('pdfs')
          .update({ status: 'failed', file_url: fileUrl })
          .eq('id', pdfRecord.id)

        return NextResponse.json({
          error:
            'This PDF appears to be scanned or image-based. Text extraction is not available. Please upload a text-based PDF.',
          pdfId: pdfRecord.id,
        }, { status: 422 })
      }

      // Save pages to database
      await savePDFPages(pdfRecord.id, pages)

      // Update PDF record as ready
      const { data: updatedPdf } = await supabaseAdmin
        .from('pdfs')
        .update({
          file_url: fileUrl,
          total_pages: totalPages,
          status: 'ready',
        })
        .eq('id', pdfRecord.id)
        .select()
        .single()

      return NextResponse.json({
        success: true,
        pdf: updatedPdf,
        message: `PDF processed successfully. ${totalPages} pages extracted.`,
      })
    } catch (processingError) {
      await supabaseAdmin.from('pdfs').update({ status: 'failed' }).eq('id', pdfRecord.id)
      throw processingError
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
