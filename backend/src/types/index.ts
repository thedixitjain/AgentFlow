import { z } from 'zod';

// Agent Types
export type AgentType = 'orchestrator' | 'ingest' | 'question' | 'verifier' | 'summarizer' | 'manager';

export type AgentStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface AgentState {
  id: string;
  type: AgentType;
  status: AgentStatus;
  currentTask?: string;
  lastActivity: Date;
  metrics: {
    tasksCompleted: number;
    avgResponseTime: number;
    errorCount: number;
  };
}

// Task Types
export type TaskType = 'ingest' | 'analyze' | 'question' | 'verify' | 'summarize';

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  assignedAgent?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

// Document Types
export type DocumentType = 'csv' | 'xlsx' | 'pdf' | 'txt';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  content?: string;
  data?: Record<string, unknown>[];
  columns?: string[];
  metadata: {
    uploadedAt: Date;
    processedAt?: Date;
    rowCount?: number;
    wordCount?: number;
  };
}

// Message Types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentType?: AgentType;
  timestamp: Date;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    provider?: string;
  };
}

// Session Types
export interface Session {
  id: string;
  documents: Document[];
  messages: Message[];
  agentStates: Record<string, AgentState>;
  createdAt: Date;
  updatedAt: Date;
}

// LLM Types
export type LLMProvider = 'groq' | 'openai' | 'anthropic';

export interface LLMRequest {
  provider: LLMProvider;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  tokensUsed: number;
  provider: LLMProvider;
  model: string;
  responseTime: number;
  cost: number;
}

// API Schemas
export const CreateSessionSchema = z.object({
  name: z.string().optional(),
});

export const SendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  documentId: z.string().uuid().optional(),
});

export const UploadDocumentSchema = z.object({
  sessionId: z.string().uuid(),
});

// Metrics Types
export interface SystemMetrics {
  activeAgents: number;
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgResponseTime: number;
  totalTokensUsed: number;
  totalCost: number;
  uptime: number;
}
