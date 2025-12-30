const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Session {
  id: string;
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
  metadata: {
    uploadedAt: string;
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
  uptime: number;
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
  async uploadDocument(sessionId: string, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}/documents`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload document');
    }

    return response.json();
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
    documentId?: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
