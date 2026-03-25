export interface WorkspaceStateSnapshot {
  lastSessionId: string
  activeDocument: string | null
  showInsights: boolean
  showSystemInsights: boolean
  showBusinessReport: boolean
}

const WORKSPACE_STATE_KEY = 'agentflow_workspace_state'

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function coerceWorkspaceStateSnapshot(value: unknown): WorkspaceStateSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<WorkspaceStateSnapshot>
  if (
    typeof candidate.lastSessionId !== 'string' ||
    (candidate.activeDocument !== null && typeof candidate.activeDocument !== 'string') ||
    typeof candidate.showInsights !== 'boolean' ||
    typeof candidate.showSystemInsights !== 'boolean'
  ) {
    return null
  }

  return {
    lastSessionId: candidate.lastSessionId,
    activeDocument: candidate.activeDocument ?? null,
    showInsights: candidate.showInsights,
    showBusinessReport:
      typeof candidate.showBusinessReport === 'boolean' ? candidate.showBusinessReport : true,
    showSystemInsights: candidate.showSystemInsights,
  }
}

export function loadWorkspaceState(): WorkspaceStateSnapshot | null {
  if (!hasStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_STATE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    return coerceWorkspaceStateSnapshot(parsed)
  } catch {
    return null
  }
}

export function saveWorkspaceState(state: WorkspaceStateSnapshot): void {
  if (!hasStorage()) {
    return
  }

  window.localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(state))
}

export function clearWorkspaceState(): void {
  if (!hasStorage()) {
    return
  }

  window.localStorage.removeItem(WORKSPACE_STATE_KEY)
}

export function resolveRestoredDocumentName(
  documentNames: string[],
  preferredDocument: string | null,
): string | null {
  if (preferredDocument && documentNames.includes(preferredDocument)) {
    return preferredDocument
  }

  return documentNames[documentNames.length - 1] || null
}
