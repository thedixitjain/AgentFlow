const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const WORKSPACE_STORAGE_KEY = 'agentflow_workspace_id';

function getWorkspaceId(): string {
  if (typeof window === 'undefined') {
    return 'local-workspace';
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

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
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
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
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

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error('No response body');

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
            }
            if (parsed.done && parsed.agentUsed) {
              onComplete(parsed.agentUsed);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
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
