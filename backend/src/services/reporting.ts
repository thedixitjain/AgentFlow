import { v4 as uuidv4 } from 'uuid';
import { llmService } from './llm.js';
import type {
  Document,
  ReportConfidence,
  Session,
  WorkspaceReport,
} from '../types/index.js';

interface ReportDraft {
  title?: unknown;
  focus?: unknown;
  overview?: unknown;
  highlights?: unknown;
  risks?: unknown;
  actions?: unknown;
  followUps?: unknown;
  confidence?: unknown;
}

const UUID_PATTERN =
  /[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/gi;

function toReadableName(name: string): string {
  const extensionMatch = name.match(/(\.[a-z0-9]{1,5})$/i);
  const extension = extensionMatch?.[1] || '';
  const baseName = extension ? name.slice(0, -extension.length) : name;

  const cleaned = baseName
    .replace(UUID_PATTERN, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return `${cleaned || 'Business document'}${extension}`;
}

function normaliseText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || fallback;
}

function normaliseConfidence(value: unknown): ReportConfidence {
  if (typeof value !== 'string') {
    return 'medium';
  }

  const lowered = value.toLowerCase();
  if (lowered === 'high' || lowered === 'medium' || lowered === 'low') {
    return lowered;
  }

  return 'medium';
}

function normaliseList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .map((item) => (typeof item === 'string' ? item.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean)
    .slice(0, 5);

  return cleaned.length > 0 ? cleaned : fallback;
}

function extractJsonPayload(raw: string): ReportDraft | null {
  const direct = raw.trim();
  const fencedMatch = direct.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || direct;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as ReportDraft;
  } catch {
    return null;
  }
}

function buildDocumentSummary(document?: Document): string {
  if (!document) {
    return 'No active document is attached to this workspace yet.';
  }

  const details: string[] = [
    `Document: ${toReadableName(document.name)}`,
    `Type: ${document.type.toUpperCase()}`,
  ];

  if (document.metadata.rowCount) {
    details.push(`Rows: ${document.metadata.rowCount}`);
  }

  if (document.metadata.wordCount) {
    details.push(`Words: ${document.metadata.wordCount}`);
  }

  if (document.columns && document.columns.length > 0) {
    details.push(`Columns: ${document.columns.slice(0, 8).join(', ')}`);
  }

  if (document.content) {
    details.push(`Content preview: ${document.content.slice(0, 800)}`);
  }

  if (document.data && document.data.length > 0) {
    const previewRows = document.data.slice(0, 5).map((row, index) => {
      const rowPreview = Object.entries(row)
        .slice(0, 5)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ');
      return `Row ${index + 1}: ${rowPreview}`;
    });
    details.push(`Data preview:\n${previewRows.join('\n')}`);
  }

  return details.join('\n');
}

function buildConversationSummary(session: Session): string {
  const recentMessages = session.messages.slice(-8).map((message) => {
    return `${message.role.toUpperCase()}: ${message.content}`;
  });

  return recentMessages.length > 0
    ? recentMessages.join('\n')
    : 'No conversation has happened in this workspace yet.';
}

function buildFallbackReport(session: Session, document?: Document): WorkspaceReport {
  const latestAssistant = [...session.messages].reverse().find((message) => message.role === 'assistant');
  const latestUser = [...session.messages].reverse().find((message) => message.role === 'user');
  const readableName = toReadableName(document?.name || 'Business workspace');
  const baseTitle = readableName.replace(/\.[a-z0-9]{1,5}$/i, '');
  const rowCount = document?.metadata.rowCount;

  return {
    id: uuidv4(),
    title: `${baseTitle} Decision Brief`,
    focus: latestUser?.content || 'Business review',
    overview: latestAssistant?.content.slice(0, 280) || `AgentFlow prepared a concise review for ${baseTitle}.`,
    highlights: [
      document ? `Primary source: ${readableName}` : 'Workspace conversation is ready for review.',
      rowCount ? `Structured dataset includes ${rowCount} rows.` : 'The latest response is available for stakeholder review.',
      latestAssistant ? 'A draft AI response has been generated and can be turned into a report.' : 'Generate a conversation to unlock richer business recommendations.',
    ],
    risks: [
      'Review any sensitive business decisions before sharing externally.',
      'Validate key numbers against the source document if they will be used in leadership reporting.',
    ],
    actions: [
      latestUser ? `Confirm whether the answer fully addresses: ${latestUser.content}` : 'Add a clear question or goal to sharpen the next report.',
      'Share the summary with an owner and capture the next decision or follow-up.',
    ],
    followUps: [
      'What decision should this report help you make next?',
      'Which KPI or trend needs deeper validation before acting on it?',
    ],
    confidence: latestAssistant && document ? 'medium' : 'low',
    source: 'heuristic',
    documentId: document?.id,
    generatedAt: new Date(),
  };
}

function toWorkspaceReport(
  parsed: ReportDraft,
  fallback: WorkspaceReport,
): WorkspaceReport {
  return {
    ...fallback,
    title: normaliseText(parsed.title, fallback.title),
    focus: normaliseText(parsed.focus, fallback.focus),
    overview: normaliseText(parsed.overview, fallback.overview),
    highlights: normaliseList(parsed.highlights, fallback.highlights),
    risks: normaliseList(parsed.risks, fallback.risks),
    actions: normaliseList(parsed.actions, fallback.actions),
    followUps: normaliseList(parsed.followUps, fallback.followUps),
    confidence: normaliseConfidence(parsed.confidence),
    source: 'llm',
  };
}

class ReportingService {
  async generateWorkspaceReport(session: Session, document?: Document): Promise<WorkspaceReport> {
    const fallback = buildFallbackReport(session, document);
    const messages = [
      {
        role: 'system' as const,
        content:
          'You are an operating partner preparing a decision brief for a small business team. Return JSON only with keys: title, focus, overview, highlights, risks, actions, followUps, confidence. Use confidence values high, medium, or low. Keep highlights, risks, actions, and followUps as concise string arrays with 2 to 5 items each.',
      },
      {
        role: 'user' as const,
        content: [
          'Prepare a business-ready decision brief from this workspace context.',
          '',
          `WORKSPACE ID: ${session.id}`,
          '',
          'DOCUMENT SUMMARY:',
          buildDocumentSummary(document),
          '',
          'RECENT CONVERSATION:',
          buildConversationSummary(session),
          '',
          'Return JSON only.',
        ].join('\n'),
      },
    ];

    try {
      const response = await llmService.complete({
        provider: 'groq',
        messages,
        temperature: 0.2,
        maxTokens: 900,
      });

      const parsed = extractJsonPayload(response.content);
      if (!parsed) {
        return fallback;
      }

      return toWorkspaceReport(parsed, fallback);
    } catch {
      return fallback;
    }
  }
}

export const reportingService = new ReportingService();
