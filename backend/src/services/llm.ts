import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { llmTokensUsed, llmCost, llmLatency, llmRequests, llmFallbacks } from '../utils/metrics.js';
import { telemetryService } from './telemetry.js';
import type { LLMProvider, LLMRequest, LLMResponse } from '../types/index.js';

class LLMService {
  private gemini: GoogleGenerativeAI | null = null;
  private groq: Groq | null = null;
  private openai: OpenAI | null = null;
  private dailyCost = 0;
  private lastCostReset = new Date();

  constructor() {
    if (config.llm.gemini.apiKey) {
      this.gemini = new GoogleGenerativeAI(config.llm.gemini.apiKey);
    }
    if (config.llm.groq.apiKey) {
      this.groq = new Groq({ apiKey: config.llm.groq.apiKey });
    }
    if (config.llm.openai.apiKey) {
      this.openai = new OpenAI({ apiKey: config.llm.openai.apiKey });
    }
  }

  private resetDailyCostIfNeeded() {
    const now = new Date();
    if (now.getDate() !== this.lastCostReset.getDate()) {
      this.dailyCost = 0;
      this.lastCostReset = now;
    }
  }

  private getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (this.gemini) providers.push('gemini');
    if (this.groq) providers.push('groq');
    if (this.openai) providers.push('openai');
    return providers;
  }

  private selectProvider(preferred?: LLMProvider): LLMProvider {
    const available = this.getAvailableProviders();
    if (available.length === 0) {
      throw new Error('No LLM providers configured. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in your environment.');
    }
    if (preferred && available.includes(preferred)) {
      return preferred;
    }
    // Default priority: groq > gemini > openai
    if (available.includes('groq')) return 'groq';
    if (available.includes('gemini')) return 'gemini';
    return 'openai';
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.selectProvider(request.provider);
    const originalProvider = request.provider;
    const startTime = Date.now();

    try {
      let response: LLMResponse;

      switch (provider) {
        case 'gemini':
          response = await this.completeGemini(request);
          break;
        case 'groq':
          response = await this.completeGroq(request);
          break;
        case 'openai':
          response = await this.completeOpenAI(request);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      const duration = (Date.now() - startTime) / 1000;
      llmLatency.observe({ provider }, duration);
      llmRequests.inc({ provider, status: 'success' });
      llmTokensUsed.inc({ provider, model: response.model }, response.tokensUsed);
      llmCost.inc({ provider }, response.cost);
      this.dailyCost += response.cost;
      telemetryService.recordProviderEvent({
        provider,
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        durationSeconds: duration,
        success: true,
        fallbackFrom: originalProvider && originalProvider !== provider ? originalProvider : undefined,
      });

      logger.info('LLM completion', {
        provider,
        model: response.model,
        tokens: response.tokensUsed,
        cost: response.cost,
        duration,
      });

      return response;
    } catch (error) {
      llmRequests.inc({ provider, status: 'failure' });
      telemetryService.recordProviderEvent({
        provider,
        model: provider,
        tokensUsed: 0,
        cost: 0,
        durationSeconds: (Date.now() - startTime) / 1000,
        success: false,
      });
      logger.error('LLM completion failed', { provider, error });

      // Try fallback provider
      const fallback = this.getAvailableProviders().find(p => p !== provider);
      if (fallback) {
        llmFallbacks.inc({ from_provider: provider, to_provider: fallback });
        llmRequests.inc({ provider, status: 'fallback' });
        logger.info('Trying fallback provider', { fallback });
        return this.complete({ ...request, provider: fallback });
      }

      throw error;
    }
  }

  private async completeGemini(request: LLMRequest): Promise<LLMResponse> {
    if (!this.gemini) throw new Error('Gemini not configured');

    const startTime = Date.now();
    const model = this.gemini.getGenerativeModel({
      model: config.llm.gemini.model,
    });

    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');
    const promptPrefix = systemMessage?.content ? `${systemMessage.content}\n\n` : '';

    // Build chat history (all but last message)
    const history = otherMessages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = otherMessages[otherMessages.length - 1];

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: request.temperature ?? 0.4,
        maxOutputTokens: request.maxTokens || config.llm.gemini.maxTokens,
      },
    });

    const result = await chat.sendMessage(`${promptPrefix}${lastMessage?.content || ''}`);
    const text = result.response.text();
    const usage = result.response.usageMetadata;
    const tokensUsed = (usage?.totalTokenCount) || 0;
    const cost = (tokensUsed / 1000) * config.llm.gemini.costPer1kTokens;

    return {
      content: text,
      tokensUsed,
      provider: 'gemini',
      model: config.llm.gemini.model,
      responseTime: Date.now() - startTime,
      cost,
    };
  }

  private async completeGroq(request: LLMRequest): Promise<LLMResponse> {
    if (!this.groq) throw new Error('Groq not configured');

    const startTime = Date.now();
    const completion = await this.groq.chat.completions.create({
      model: config.llm.groq.model,
      messages: request.messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      max_tokens: request.maxTokens || config.llm.groq.maxTokens,
      temperature: request.temperature || 0.4,
    });

    const tokensUsed = completion.usage?.total_tokens || 0;
    const cost = (tokensUsed / 1000) * config.llm.groq.costPer1kTokens;

    return {
      content: completion.choices[0]?.message?.content || '',
      tokensUsed,
      provider: 'groq',
      model: config.llm.groq.model,
      responseTime: Date.now() - startTime,
      cost,
    };
  }

  private async completeOpenAI(request: LLMRequest): Promise<LLMResponse> {
    if (!this.openai) throw new Error('OpenAI not configured');

    const startTime = Date.now();
    const completion = await this.openai.chat.completions.create({
      model: config.llm.openai.model,
      messages: request.messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      max_tokens: request.maxTokens || config.llm.openai.maxTokens,
      temperature: request.temperature || 0.4,
    });

    const tokensUsed = completion.usage?.total_tokens || 0;
    const cost = (tokensUsed / 1000) * config.llm.openai.costPer1kTokens;

    return {
      content: completion.choices[0]?.message?.content || '',
      tokensUsed,
      provider: 'openai',
      model: config.llm.openai.model,
      responseTime: Date.now() - startTime,
      cost,
    };
  }

  getDailyCost(): number {
    this.resetDailyCostIfNeeded();
    return this.dailyCost;
  }

  getBudgetStatus(): { used: number; limit: number; percentage: number } {
    return {
      used: this.dailyCost,
      limit: config.costs.dailyBudget,
      percentage: (this.dailyCost / config.costs.dailyBudget) * 100,
    };
  }
}

export const llmService = new LLMService();
