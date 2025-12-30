import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const activeAgents = new client.Gauge({
  name: 'agentflow_active_agents',
  help: 'Number of active agents',
  labelNames: ['type'],
});

export const taskCounter = new client.Counter({
  name: 'agentflow_tasks_total',
  help: 'Total number of tasks processed',
  labelNames: ['type', 'status'],
});

export const taskDuration = new client.Histogram({
  name: 'agentflow_task_duration_seconds',
  help: 'Duration of task processing in seconds',
  labelNames: ['type'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
});

export const llmTokensUsed = new client.Counter({
  name: 'agentflow_llm_tokens_total',
  help: 'Total LLM tokens used',
  labelNames: ['provider', 'model'],
});

export const llmCost = new client.Counter({
  name: 'agentflow_llm_cost_dollars',
  help: 'Total LLM cost in dollars',
  labelNames: ['provider'],
});

export const llmLatency = new client.Histogram({
  name: 'agentflow_llm_latency_seconds',
  help: 'LLM response latency in seconds',
  labelNames: ['provider'],
  buckets: [0.5, 1, 2, 3, 5, 10],
});

export const queueSize = new client.Gauge({
  name: 'agentflow_queue_size',
  help: 'Current size of task queue',
  labelNames: ['queue'],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(activeAgents);
register.registerMetric(taskCounter);
register.registerMetric(taskDuration);
register.registerMetric(llmTokensUsed);
register.registerMetric(llmCost);
register.registerMetric(llmLatency);
register.registerMetric(queueSize);

export { register };
