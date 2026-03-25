import type { DocumentFile } from './types'

export type WorkspaceTemplateId = 'sales-analyst' | 'support-copilot' | 'content-writer'

interface WorkspaceTemplateSeed {
  id: WorkspaceTemplateId
  name: string
  description: string
  category: string
  recommendedPrompt: string
  file: Omit<DocumentFile, 'uploadedAt'>
}

const SALES_DATA_CSV = `Date,Product,Region,Revenue,Units,Channel
2026-01-05,Starter Plan,North America,18000,90,Self-serve
2026-01-12,Growth Plan,Europe,24500,70,Sales-led
2026-01-18,Starter Plan,APAC,12600,63,Partner
2026-02-03,Enterprise,North America,52000,8,Sales-led
2026-02-11,Growth Plan,Europe,27200,77,Sales-led
2026-02-14,Starter Plan,LatAm,8400,42,Self-serve
2026-02-26,Enterprise,EMEA,61000,9,Channel
2026-03-02,Growth Plan,North America,29800,83,Sales-led
2026-03-08,Starter Plan,Europe,14200,71,Self-serve
2026-03-14,Enterprise,APAC,47000,7,Partner`

const SUPPORT_TRANSCRIPT = `Weekly support operations brief

- Average first response time dropped from 31 minutes to 18 minutes.
- Escalations are concentrated in billing disputes and SSO onboarding.
- CSAT rose to 94 percent after shipping the account recovery fix.
- The team needs a playbook for enterprise onboarding questions.
- Renewals are at risk when high-value tickets stay open for more than 48 hours.`

const CONTENT_BRIEF = `Q2 launch brief

Audience: operations leaders at SMB software companies.
Goal: show AgentFlow as the fastest path from weekly reports to leadership-ready summaries and action items.
Proof points:
- templates for support ops, revenue reviews, and campaign messaging
- grounded answers from uploaded CSVs, PDFs, and briefs, not generic chat
- optional sign-in and saved sessions so teams don’t start from zero each week
CTA: invite them to upload last week’s deck or spreadsheet and ask for a one-page brief`

export const WORKSPACE_TEMPLATES: WorkspaceTemplateSeed[] = [
  {
    id: 'sales-analyst',
    name: 'Sales Analyst',
    description: 'Load revenue data and start with KPI and trend analysis.',
    category: 'Revenue',
    recommendedPrompt: 'Summarize the sales trends, biggest risks, and next actions for leadership.',
    file: {
      name: 'sales-analyst-template.csv',
      type: 'csv',
      size: SALES_DATA_CSV.length,
      content: SALES_DATA_CSV,
      data: SALES_DATA_CSV.split('\n').slice(1).map((row) => {
        const [Date, Product, Region, Revenue, Units, Channel] = row.split(',')
        return { Date, Product, Region, Revenue: Number(Revenue), Units: Number(Units), Channel }
      }),
      columns: ['Date', 'Product', 'Region', 'Revenue', 'Units', 'Channel'],
    },
  },
  {
    id: 'support-copilot',
    name: 'Support Copilot',
    description: 'Start from an ops brief to draft escalations and improve response quality.',
    category: 'Support',
    recommendedPrompt: 'Turn this support brief into a plan for the head of support with clear priorities.',
    file: {
      name: 'support-copilot-template.txt',
      type: 'txt',
      size: SUPPORT_TRANSCRIPT.length,
      content: SUPPORT_TRANSCRIPT,
    },
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    description: 'Use a campaign brief to generate launch messaging and content drafts.',
    category: 'Marketing',
    recommendedPrompt: 'Write a launch-ready product announcement using this brief and keep the tone sharp and confident.',
    file: {
      name: 'content-writer-template.txt',
      type: 'txt',
      size: CONTENT_BRIEF.length,
      content: CONTENT_BRIEF,
    },
  },
]

export function getWorkspaceTemplate(id: WorkspaceTemplateId): WorkspaceTemplateSeed {
  const template = WORKSPACE_TEMPLATES.find(item => item.id === id)
  if (!template) {
    throw new Error(`Unknown workspace template: ${id}`)
  }
  return template
}

export function buildWorkspaceTemplateDocument(id: WorkspaceTemplateId): DocumentFile {
  const template = getWorkspaceTemplate(id)
  return {
    ...template.file,
    uploadedAt: new Date(),
  }
}
