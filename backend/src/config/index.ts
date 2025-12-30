import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  // LLM Providers
  llm: {
    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 4096,
      costPer1kTokens: 0.0007,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo-preview',
      maxTokens: 4096,
      costPer1kTokens: 0.01,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4096,
      costPer1kTokens: 0.003,
    },
  },
  
  // Cost Management
  costs: {
    dailyBudget: parseFloat(process.env.DAILY_BUDGET || '10'),
    warningThreshold: 0.8,
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 60 * 1000,
    max: 100,
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};
