/** Local dev: default Express URL. Vercel prod: set NEXT_PUBLIC_API_URL=/agentflow-api (same-origin proxy; see next.config.js). */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const WORKSPACE_STORAGE_KEY = 'agentflow_workspace_id';
const AUTH_WORKSPACE_STORAGE_KEY = 'agentflow_authenticated_workspace_id';

function normalizeWorkspaceIdentity(identity: string): string {
  return `user-${identity.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function syncWorkspaceIdentity(identity: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!identity) {
    window.localStorage.removeItem(AUTH_WORKSPACE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    AUTH_WORKSPACE_STORAGE_KEY,
    normalizeWorkspaceIdentity(identity),
  );
}

function getWorkspaceId(): string {
  if (typeof window === 'undefined') {
    return 'local-workspace';
  }

  const authenticatedWorkspace = window.localStorage.getItem(AUTH_WORKSPACE_STORAGE_KEY);
  if (authenticatedWorkspace) {
    return authenticatedWorkspace;
  }

  const existing = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextId = window.crypto?.randomUUID?.() || `workspace-${Date.now()}`;
  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, nextId);
  return nextId;
}

export interface Session {
  id: string;
  workspaceId: string;
  documents: Document[];
  messages: Message[];
  reports: WorkspaceReport[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  data?: Record<string, unknown>[];
  columns?: string[];
  metadata: {
    uploadedAt: string;
    processedAt?: string;
    indexed?: boolean;
    rowCount?: number;
    wordCount?: number;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentType?: string;
  timestamp: string;
  sources?: Array<{
    content: string;
    score: number;
    chunkIndex?: number;
  }>;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
  };
}

export interface WorkspaceReport {
  id: string;
  title: string;
  focus: string;
  overview: string;
  highlights: string[];
  risks: string[];
  actions: string[];
  followUps: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'llm' | 'heuristic';
  documentId?: string;
  generatedAt: string;
}

export interface AgentState {
  id: string;
  type: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  currentTask?: string;
  lastActivity: string;
  metrics: {
    tasksCompleted: number;
    avgResponseTime: number;
    errorCount: number;
  };
}

export interface SystemStats {
  sessions: number;
  agents: {
    total: number;
    active: number;
    idle: number;
  };
  tasks: {
    pending: number;
    active: number;
  };
  budget: {
    used: number;
    limit: number;
    percentage: number;
  };
  rag: {
    totalDocuments: number;
    totalChunks: number;
    avgChunksPerDocument: number;
  };
  telemetry: TelemetrySummary;
  latestEval: EvalRun | null;
  uptime: number;
}

export interface TelemetrySummary {
  routes: {
    total: number;
    recent: Array<{
      timestamp: string;
      taskType: string;
      agentType: string;
      hasDocument: boolean;
      reason: string;
    }>;
    breakdown: Record<string, number>;
  };
  retrieval: {
    total: number;
    averageTopScore: number;
    averageRetrievalLatencyMs: number;
    averageGenerationLatencyMs: number;
    recent: Array<{
      timestamp: string;
      query: string;
      documentId?: string;
      sourceCount: number;
      topScore: number;
      retrievalTimeMs: number;
      generationTimeMs: number;
    }>;
  };
  providers: {
    total: number;
    breakdown: Record<string, number>;
    recent: Array<{
      timestamp: string;
      provider: string;
      model: string;
      tokensUsed: number;
      cost: number;
      durationSeconds: number;
      success: boolean;
      fallbackFrom?: string;
    }>;
  };
  evals: {
    total: number;
    recent: Array<{
      timestamp: string;
      suite: string;
      averageScore: number;
      passedCases: number;
      totalCases: number;
    }>;
  };
}

export interface EvalRun {
  id: string;
  suiteId: string;
  createdAt: string;
  averageScore: number;
  passedCases: number;
  totalCases: number;
  results: Array<{
    caseId: string;
    title: string;
    question: string;
    answer: string;
    score: number;
    passed: boolean;
    matchedKeywords: string[];
    missingKeywords: string[];
    retrievalTimeMs: number;
    generationTimeMs: number;
    topScore: number;
    tokensUsed: number;
  }>;
}

export interface PersistenceStatus {
  mode: 'local-json' | 'database-ready';
  provider: string;
  databaseConfigured: boolean;
  lastSyncedAt: string | null;
  message: string;
}

export interface PersistenceSyncResult {
  queued: boolean;
  persisted: boolean;
  message: string;
  status: PersistenceStatus;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async getErrorMessage(response: Response): Promise<string> {
    const text = await response.text().catch(() => '');
    let message = `HTTP ${response.status}`;

    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) {
        message = json.error;
      }
    } catch {
      if (text && text.length < 400) {
        message = text;
      }
    }

    return message;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': getWorkspaceId(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  // Sessions
  async listSessions(): Promise<Session[]> {
    return this.request<Session[]>('/sessions');
  }

  async createSession(): Promise<Session> {
    return this.request<Session>('/sessions', { method: 'POST' });
  }

  async getSession(id: string): Promise<Session> {
    return this.request<Session>(`/sessions/${id}`);
  }

  async deleteSession(id: string): Promise<void> {
    await this.request(`/sessions/${id}`, { method: 'DELETE' });
  }

  // Documents
  async createParsedDocument(
    sessionId: string,
    document: {
      name: string;
      type: string;
      size: number;
      content?: string;
      data?: Record<string, unknown>[];
      columns?: string[];
    }
  ): Promise<Document> {
    return this.request<Document>(`/sessions/${sessionId}/documents/parsed`, {
      method: 'POST',
      body: JSON.stringify(document),
    });
  }

  async deleteDocument(sessionId: string, documentId: string): Promise<void> {
    await this.request(`/sessions/${sessionId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  // Chat
  async sendMessage(
    sessionId: string,
    message: string,
    documentId?: string
  ): Promise<{ message: Message; agentUsed: string; confidence?: number }> {
    return this.request(`/sessions/${sessionId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, documentId }),
    });
  }

  async streamMessage(
    sessionId: string,
    message: string,
    onChunk: (content: string) => void,
    onComplete: (agentUsed: string) => void,
    documentId?: string,
    onSources?: (sources: Array<{ content: string; score: number; chunkIndex?: number }>) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': getWorkspaceId(),
      },
      body: JSON.stringify({ message, documentId }),
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response));
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error('No response body');

    let streamError: string | null = null;
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk(parsed.content);
            }
            if (parsed.sources && onSources) {
              onSources(parsed.sources);
            }
            if (parsed.error && onError) {
              onError(parsed.error);
              streamError = parsed.error;
            }
            if (parsed.done && parsed.agentUsed) {
              onComplete(parsed.agentUsed);
              completed = true;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    if (streamError) {
      throw new Error(streamError);
    }

    if (!completed) {
      throw new Error('The response ended before the assistant finished replying.');
    }
  }

  // Agents
  async getAgentStatus(): Promise<{ agents: AgentState[]; queue: { pending: number; active: number } }> {
    return this.request('/agents/status');
  }

  // Stats
  async getStats(): Promise<SystemStats> {
    return this.request('/stats');
  }

  async getTelemetry(): Promise<TelemetrySummary> {
    return this.request('/telemetry');
  }

  async getEvalRuns(): Promise<{ runs: EvalRun[] }> {
    return this.request('/evals/runs');
  }

  async runEvalSuite(suiteId: string = 'baseline-document-qa'): Promise<EvalRun> {
    return this.request('/evals/run', {
      method: 'POST',
      body: JSON.stringify({ suiteId }),
    });
  }

  async getPersistenceStatus(): Promise<PersistenceStatus> {
    return this.request('/persistence/status');
  }

  async persistSession(id: string): Promise<PersistenceSyncResult> {
    return this.request(`/sessions/${id}/persist`, {
      method: 'POST',
    });
  }

  async listReports(sessionId: string): Promise<{ reports: WorkspaceReport[] }> {
    return this.request(`/sessions/${sessionId}/reports`);
  }

  async generateReport(sessionId: string, documentId?: string): Promise<WorkspaceReport> {
    return this.request(`/sessions/${sessionId}/reports/generate`, {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    });
  }

  // Budget
  async getBudget(): Promise<{ used: number; limit: number; percentage: number }> {
    return this.request('/budget');
  }

  // Health
  async checkHealth(): Promise<{ status: string; uptime: number }> {
    return this.request('/health');
  }
}

export const api = new ApiClient();
