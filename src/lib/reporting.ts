import type { WorkspaceReport } from './api'

function formatList(title: string, items: string[]): string {
  if (items.length === 0) {
    return `${title}\n- None captured\n`
  }

  return `${title}\n${items.map((item) => `- ${item}`).join('\n')}\n`
}

export function buildBusinessReportMarkdown(report: WorkspaceReport): string {
  return [
    `# ${report.title}`,
    '',
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    `Confidence: ${report.confidence}`,
    `Source: ${report.source === 'llm' ? 'AI-generated decision brief' : 'Heuristic decision brief'}`,
    '',
    '## Focus',
    report.focus,
    '',
    '## Overview',
    report.overview,
    '',
    formatList('## Highlights', report.highlights),
    formatList('## Risks', report.risks),
    formatList('## Recommended Actions', report.actions),
    formatList('## Follow-up Questions', report.followUps),
  ].join('\n').trim()
}

export function getBusinessReportFilename(report: WorkspaceReport): string {
  const safeTitle = report.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${safeTitle || 'agentflow-decision-brief'}.md`
}

export function downloadBusinessReport(report: WorkspaceReport): void {
  if (typeof window === 'undefined') {
    return
  }

  const blob = new Blob([buildBusinessReportMarkdown(report)], { type: 'text/markdown;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = getBusinessReportFilename(report)
  anchor.click()
  window.URL.revokeObjectURL(url)
}
