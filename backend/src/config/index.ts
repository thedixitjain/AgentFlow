import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();
dotenv.config({ path: resolve(process.cwd(), '../.env.local'), override: false });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // LLM Providers
  llm: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: 'gemini-2.0-flash',
      maxTokens: 4096,
      costPer1kTokens: 0.0003, // ~$0.30 per 1M tokens
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 4096,
      costPer1kTokens: 0.0007,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o-mini',
      maxTokens: 4096,
      costPer1kTokens: 0.00015,
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

  // CORS — comma-separated origins, e.g. https://agentflow.thedixitjain.com,http://localhost:3000
  cors: {
    allowedOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
};
