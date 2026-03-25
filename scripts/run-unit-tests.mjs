import assert from 'node:assert/strict'
import {
  clearWorkspaceState,
  loadWorkspaceState,
  resolveRestoredDocumentName,
  saveWorkspaceState,
} from '../src/lib/workspaceState.ts'
import {
  CHAT_CONNECTION_ERROR_MESSAGE,
  buildParsedTextDocument,
  getUploadErrorMessage,
  normalizeChatInput,
  toReadableConversationTitle,
  toReadableDocumentName,
  toUserFacingAppError,
} from '../src/lib/businessUx.ts'
import {
  buildBusinessReportMarkdown,
  getBusinessReportFilename,
} from '../src/lib/reporting.ts'
import { getErrorMessage, getErrorStatus } from '../backend/src/utils/errors.ts'

class MemoryStorage {
  constructor() {
    this.values = new Map()
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    this.values.set(key, value)
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

function runWorkspaceStateTests() {
  const originalWindow = globalThis.window
  const storage = new MemoryStorage()

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage },
  })

  try {
    saveWorkspaceState({
      lastSessionId: 'session-123',
      activeDocument: 'plan.pdf',
      showInsights: true,
      showBusinessReport: true,
      showSystemInsights: false,
    })

    assert.deepEqual(loadWorkspaceState(), {
      lastSessionId: 'session-123',
      activeDocument: 'plan.pdf',
      showInsights: true,
      showBusinessReport: true,
      showSystemInsights: false,
    })

    storage.setItem('agentflow_workspace_state', '{"lastSessionId":1}')
    assert.equal(loadWorkspaceState(), null)

    storage.setItem(
      'agentflow_workspace_state',
      JSON.stringify({
        lastSessionId: 'legacy-session',
        activeDocument: 'legacy.csv',
        showInsights: true,
        showSystemInsights: false,
      }),
    )
    assert.deepEqual(loadWorkspaceState(), {
      lastSessionId: 'legacy-session',
      activeDocument: 'legacy.csv',
      showInsights: true,
      showBusinessReport: true,
      showSystemInsights: false,
    })

    saveWorkspaceState({
      lastSessionId: 'session-456',
      activeDocument: null,
      showInsights: false,
      showBusinessReport: false,
      showSystemInsights: true,
    })
    assert.deepEqual(loadWorkspaceState(), {
      lastSessionId: 'session-456',
      activeDocument: null,
      showInsights: false,
      showBusinessReport: false,
      showSystemInsights: true,
    })

    clearWorkspaceState()
    assert.equal(loadWorkspaceState(), null)

    assert.equal(
      resolveRestoredDocumentName(['alpha.csv', 'beta.csv'], 'alpha.csv'),
      'alpha.csv',
    )
    assert.equal(
      resolveRestoredDocumentName(['alpha.csv', 'beta.csv'], 'missing.csv'),
      'beta.csv',
    )
    assert.equal(resolveRestoredDocumentName([], 'missing.csv'), null)
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    })
  }
}

async function runBusinessUxTests() {
  assert.equal(normalizeChatInput('', false), null)
  assert.equal(normalizeChatInput('   ', false), null)
  assert.equal(normalizeChatInput('Send this', true), null)
  assert.equal(normalizeChatInput('  Send this  ', false), 'Send this')

  const uploadedPdf = buildParsedTextDocument(
    { name: 'board-brief.pdf', size: 1024 },
    'pdf',
    'Executive summary',
    new Date('2026-03-23T00:00:00.000Z'),
  )
  assert.equal(uploadedPdf.content, 'Executive summary')
  assert.equal(uploadedPdf.type, 'pdf')

  const uploadedDocx = buildParsedTextDocument(
    { name: 'customer_support_runbook.docx', size: 2048 },
    'docx',
    '',
    new Date('2026-03-23T00:00:00.000Z'),
  )
  assert.equal(uploadedDocx.content, 'DOCX content could not be extracted.')

  const uploadFailure = await getUploadErrorMessage(
    new Response(JSON.stringify({ error: 'Failed to fetch' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }),
    'We could not upload this file.',
  )
  assert.equal(uploadFailure, 'We could not upload this file.')

  const friendlyUploadFailure = await getUploadErrorMessage(
    new Response(JSON.stringify({ error: 'This file is empty.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }),
    'We could not upload this file.',
  )
  assert.equal(friendlyUploadFailure, 'This file is empty.')

  const withHint = await getUploadErrorMessage(
    new Response(
      JSON.stringify({
        error: 'Classic Word .doc format is not supported here.',
        hint: 'Save as .docx and upload again.',
      }),
      { status: 415, headers: { 'Content-Type': 'application/json' } },
    ),
    'We could not upload this file.',
  )
  assert.ok(withHint.includes('Classic Word'))
  assert.ok(withHint.includes('docx'))

  assert.equal(
    toUserFacingAppError(new Error('Failed to fetch'), 'fallback'),
    CHAT_CONNECTION_ERROR_MESSAGE,
  )
  assert.equal(
    toReadableDocumentName('customer_support_policy_123e4567-e89b-12d3-a456-426614174000.pdf'),
    'customer support policy.pdf',
  )
  assert.equal(
    toReadableConversationTitle('session-123e4567-e89b-12d3-a456-426614174000'),
    'Untitled workspace',
  )
}

function runReportingHelperTests() {
  const report = {
    id: 'report-1',
    title: 'Q4 Revenue Decision Brief',
    focus: 'Prepare a board-ready summary for Q4.',
    overview: 'Revenue increased while churn improved.',
    highlights: ['Revenue grew 25%.', 'Churn dropped by 3%.'],
    risks: ['Enterprise renewals still need close review.'],
    actions: ['Prepare renewal mitigation plan.'],
    followUps: ['Which segment drove the strongest growth?'],
    confidence: 'high',
    source: 'llm',
    generatedAt: '2026-03-23T00:00:00.000Z',
  }

  const markdown = buildBusinessReportMarkdown(report)
  assert.match(markdown, /# Q4 Revenue Decision Brief/)
  assert.match(markdown, /## Recommended Actions/)
  assert.equal(getBusinessReportFilename(report), 'q4-revenue-decision-brief.md')
}

function runErrorUtilityTests() {
  const message = getErrorMessage(
    new Error('No LLM providers configured. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in your environment.'),
    'fallback',
  )

  assert.match(message, /Add a provider API key to the backend environment/)
  assert.equal(getErrorStatus(new Error('Groq not configured')), 503)
  assert.equal(getErrorStatus(new Error('Something else failed')), 500)
}

runWorkspaceStateTests()
await runBusinessUxTests()
runReportingHelperTests()
runErrorUtilityTests()

console.log('Unit tests passed: workspace state + business UX helpers + reporting helpers + backend error utilities')
