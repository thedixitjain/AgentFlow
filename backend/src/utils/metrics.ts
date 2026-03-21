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

export const llmRequests = new client.Counter({
  name: 'agentflow_llm_requests_total',
  help: 'Total number of LLM requests',
  labelNames: ['provider', 'status'],
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

export const llmFallbacks = new client.Counter({
  name: 'agentflow_llm_fallbacks_total',
  help: 'Total number of LLM provider fallbacks',
  labelNames: ['from_provider', 'to_provider'],
});

export const routeSelections = new client.Counter({
  name: 'agentflow_route_selections_total',
  help: 'Total number of routing decisions',
  labelNames: ['task_type', 'agent_type', 'has_document'],
});

export const ragQueries = new client.Counter({
  name: 'agentflow_rag_queries_total',
  help: 'Total number of RAG queries',
  labelNames: ['result'],
});

export const ragRetrievalLatency = new client.Histogram({
  name: 'agentflow_rag_retrieval_latency_ms',
  help: 'RAG retrieval latency in milliseconds',
  buckets: [10, 25, 50, 100, 250, 500, 1000, 3000],
});

export const ragGenerationLatency = new client.Histogram({
  name: 'agentflow_rag_generation_latency_ms',
  help: 'RAG generation latency in milliseconds',
  buckets: [50, 100, 250, 500, 1000, 3000, 5000, 10000],
});

export const ragTopScore = new client.Histogram({
  name: 'agentflow_rag_top_score',
  help: 'Top retrieval similarity score for RAG queries',
  buckets: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1],
});

export const evalRuns = new client.Counter({
  name: 'agentflow_eval_runs_total',
  help: 'Total number of evaluation runs',
  labelNames: ['suite', 'status'],
});

export const evalCaseScore = new client.Histogram({
  name: 'agentflow_eval_case_score',
  help: 'Per-case evaluation score',
  labelNames: ['suite'],
  buckets: [0, 0.25, 0.5, 0.75, 1],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(activeAgents);
register.registerMetric(taskCounter);
register.registerMetric(taskDuration);
register.registerMetric(llmTokensUsed);
register.registerMetric(llmRequests);
register.registerMetric(llmCost);
register.registerMetric(llmLatency);
register.registerMetric(queueSize);
register.registerMetric(llmFallbacks);
register.registerMetric(routeSelections);
register.registerMetric(ragQueries);
register.registerMetric(ragRetrievalLatency);
register.registerMetric(ragGenerationLatency);
register.registerMetric(ragTopScore);
register.registerMetric(evalRuns);
register.registerMetric(evalCaseScore);

export { register };
