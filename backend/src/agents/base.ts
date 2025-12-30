import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { activeAgents } from '../utils/metrics.js';
import type { AgentType, AgentState, AgentStatus, Task } from '../types/index.js';

export abstract class BaseAgent {
  protected id: string;
  protected type: AgentType;
  protected status: AgentStatus = 'idle';
  protected currentTask?: string;
  protected metrics = {
    tasksCompleted: 0,
    totalResponseTime: 0,
    errorCount: 0,
  };

  constructor(type: AgentType) {
    this.id = uuidv4();
    this.type = type;
    activeAgents.inc({ type });
    logger.info(`Agent initialized`, { id: this.id, type });
  }

  abstract process(task: Task): Promise<Record<string, unknown>>;

  async execute(task: Task): Promise<Record<string, unknown>> {
    const startTime = Date.now();
    this.status = 'processing';
    this.currentTask = task.id;

    logger.info(`Agent processing task`, { 
      agentId: this.id, 
      agentType: this.type, 
      taskId: task.id,
      taskType: task.type,
    });

    try {
      const result = await this.process(task);
      
      this.metrics.tasksCompleted++;
      this.metrics.totalResponseTime += Date.now() - startTime;
      this.status = 'completed';
      
      logger.info(`Agent completed task`, {
        agentId: this.id,
        taskId: task.id,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.metrics.errorCount++;
      this.status = 'error';
      
      logger.error(`Agent task failed`, {
        agentId: this.id,
        taskId: task.id,
        error,
      });

      throw error;
    } finally {
      this.currentTask = undefined;
      this.status = 'idle';
    }
  }

  getState(): AgentState {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      currentTask: this.currentTask,
      lastActivity: new Date(),
      metrics: {
        tasksCompleted: this.metrics.tasksCompleted,
        avgResponseTime: this.metrics.tasksCompleted > 0 
          ? this.metrics.totalResponseTime / this.metrics.tasksCompleted 
          : 0,
        errorCount: this.metrics.errorCount,
      },
    };
  }

  getId(): string {
    return this.id;
  }

  getType(): AgentType {
    return this.type;
  }

  isAvailable(): boolean {
    return this.status === 'idle';
  }
}
