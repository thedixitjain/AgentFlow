import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from './base.js';
import { IngestAgent } from './ingest.js';
import { QuestionAgent } from './question.js';
import { VerifierAgent } from './verifier.js';
import { SummarizerAgent } from './summarizer.js';
import { llmService } from '../services/llm.js';
import { logger } from '../utils/logger.js';
import { taskCounter, taskDuration } from '../utils/metrics.js';
import type { Task, TaskType, Document, AgentState } from '../types/index.js';

interface AgentPool {
  ingest: IngestAgent[];
  question: QuestionAgent[];
  verifier: VerifierAgent[];
  summarizer: SummarizerAgent[];
}

export class OrchestratorAgent extends BaseAgent {
  private agents: AgentPool;
  private taskQueue: Task[] = [];
  private activeTasks: Map<string, Task> = new Map();

  constructor() {
    super('orchestrator');
    
    // Initialize agent pool
    this.agents = {
      ingest: [new IngestAgent()],
      question: [new QuestionAgent(), new QuestionAgent()],
      verifier: [new VerifierAgent()],
      summarizer: [new SummarizerAgent()],
    };

    logger.info('Orchestrator initialized with agent pool', {
      ingest: this.agents.ingest.length,
      question: this.agents.question.length,
      verifier: this.agents.verifier.length,
      summarizer: this.agents.summarizer.length,
    });
  }

  async process(task: Task): Promise<Record<string, unknown>> {
    // Route task to appropriate agent
    const result = await this.routeTask(task);
    return result;
  }

  async handleMessage(
    message: string,
    document?: Document,
    history?: Array<{ role: string; content: string }>
  ): Promise<{
    response: string;
    agentUsed: string;
    tokensUsed: number;
    confidence?: number;
  }> {
    // Classify the intent
    const intent = await this.classifyIntent(message, document);
    
    logger.info('Message classified', { intent, hasDocument: !!document });

    // Create and execute appropriate task
    const task: Task = {
      id: uuidv4(),
      type: intent.taskType,
      priority: 'normal',
      status: 'pending',
      payload: {
        question: message,
        document,
        history,
        ...intent.additionalPayload,
      },
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    const startTime = Date.now();
    const result = await this.routeTask(task);
    const duration = (Date.now() - startTime) / 1000;

    taskCounter.inc({ type: task.type, status: 'completed' });
    taskDuration.observe({ type: task.type }, duration);

    return {
      response: result.answer || result.summary || JSON.stringify(result),
      agentUsed: intent.agentType,
      tokensUsed: result.tokensUsed || 0,
      confidence: result.confidence,
    };
  }

  private async classifyIntent(
    message: string,
    document?: Document
  ): Promise<{
    taskType: TaskType;
    agentType: string;
    additionalPayload: Record<string, unknown>;
  }> {
    const lowerMessage = message.toLowerCase();

    // Simple rule-based classification (can be enhanced with LLM)
    if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
      return {
        taskType: 'summarize',
        agentType: 'summarizer',
        additionalPayload: { type: 'brief' },
      };
    }

    if (lowerMessage.includes('verify') || lowerMessage.includes('check if') || lowerMessage.includes('is it true')) {
      return {
        taskType: 'verify',
        agentType: 'verifier',
        additionalPayload: { claim: message },
      };
    }

    if (document && !document.metadata?.processedAt) {
      return {
        taskType: 'ingest',
        agentType: 'ingest',
        additionalPayload: { document },
      };
    }

    // Default to question answering
    return {
      taskType: 'question',
      agentType: 'question',
      additionalPayload: {},
    };
  }

  private async routeTask(task: Task): Promise<Record<string, unknown>> {
    const agentType = this.getAgentTypeForTask(task.type);
    const agent = this.getAvailableAgent(agentType);

    if (!agent) {
      // Queue task if no agent available
      this.taskQueue.push(task);
      logger.warn('No available agent, task queued', { taskId: task.id, type: task.type });
      throw new Error('No available agent, task queued');
    }

    this.activeTasks.set(task.id, task);
    
    try {
      const result = await agent.execute(task);
      this.activeTasks.delete(task.id);
      return result;
    } catch (error) {
      this.activeTasks.delete(task.id);
      
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        logger.info('Retrying task', { taskId: task.id, attempt: task.retryCount });
        return this.routeTask(task);
      }
      
      taskCounter.inc({ type: task.type, status: 'failed' });
      throw error;
    }
  }

  private getAgentTypeForTask(taskType: TaskType): keyof AgentPool {
    const mapping: Record<TaskType, keyof AgentPool> = {
      ingest: 'ingest',
      analyze: 'question',
      question: 'question',
      verify: 'verifier',
      summarize: 'summarizer',
    };
    return mapping[taskType];
  }

  private getAvailableAgent(type: keyof AgentPool): BaseAgent | null {
    const pool = this.agents[type];
    return pool.find(agent => agent.isAvailable()) || null;
  }

  getAllAgentStates(): AgentState[] {
    const states: AgentState[] = [this.getState()];
    
    Object.values(this.agents).flat().forEach(agent => {
      states.push(agent.getState());
    });
    
    return states;
  }

  getQueueStatus(): { pending: number; active: number } {
    return {
      pending: this.taskQueue.length,
      active: this.activeTasks.size,
    };
  }
}

// Singleton instance
export const orchestrator = new OrchestratorAgent();
