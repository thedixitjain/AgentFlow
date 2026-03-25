import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

/** DOCX is a ZIP archive; legacy Word .doc is OLE compound file (different format). */
export const runtime = 'nodejs'

const MAX_BYTES = 32 * 1024 * 1024

const DOC_OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])

function isZipHeader(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b
}

function isLegacyDoc(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(DOC_OLE_MAGIC)
}

function mapExtractError(err: unknown): { status: number; body: Record<string, string> } {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()
  if (
    lower.includes('corrupt') ||
    lower.includes('end of data') ||
    lower.includes('zip') ||
    lower.includes('central directory')
  ) {
    return {
      status: 422,
      body: {
        error: 'This file could not be read as a modern Word document (.docx).',
        hint: 'If it is an older .doc file, open it in Word or Google Docs and save as .docx. If the download was incomplete, try exporting again.',
        code: 'DOCX_UNREADABLE',
      },
    }
  }
  if (lower.includes('password') || lower.includes('encrypt')) {
    return {
      status: 422,
      body: {
        error: 'This Word file appears to be password protected.',
        hint: 'Remove protection in Word, then save and upload again.',
        code: 'DOCX_ENCRYPTED',
      },
    }
  }
  return {
    status: 500,
    body: {
      error: 'Could not read this Word file.',
      hint: 'Save as .docx from Word or Google Docs, or export as PDF and upload that instead.',
      code: 'DOCX_PARSE_FAILED',
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided', code: 'NO_FILE' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'The file is empty.', code: 'EMPTY' }, { status: 400 })
    }

    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        {
          error: 'File is too large.',
          hint: `Maximum size is ${MAX_BYTES / (1024 * 1024)} MB.`,
          code: 'TOO_LARGE',
        },
        { status: 413 },
      )
    }

    if (isLegacyDoc(buffer)) {
      return NextResponse.json(
        {
          error: 'Classic Word .doc format is not supported here.',
          hint: 'Open the file in Microsoft Word or Google Docs and use Save as .docx, then upload the new file.',
          code: 'LEGACY_DOC',
        },
        { status: 415 },
      )
    }

    if (!isZipHeader(buffer)) {
      return NextResponse.json(
        {
          error: 'This file is not a valid .docx (modern Word) document.',
          hint: 'Renaming a file to .docx does not convert it. Export or save as .docx from Word, Google Docs, or Pages.',
          code: 'NOT_DOCX_ZIP',
        },
        { status: 415 },
      )
    }

    let result: Awaited<ReturnType<typeof mammoth.extractRawText>>
    try {
      result = await mammoth.extractRawText({ buffer })
    } catch (extractErr) {
      console.error('mammoth.extractRawText:', extractErr)
      const mapped = mapExtractError(extractErr)
      return NextResponse.json(mapped.body, { status: mapped.status })
    }

    const text = (result.value || '').trim()
    const fallbackBody =
      'No plain text could be extracted from this document (for example if every page is a scanned image). Add a text-based version, or type what you need in chat.'

    return NextResponse.json({
      text: text || fallbackBody,
      messages: result.messages,
    })
  } catch (error) {
    console.error('DOCX route error:', error)
    const mapped = mapExtractError(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
