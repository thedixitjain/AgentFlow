import Groq from 'groq-sdk';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { llmTokensUsed, llmCost, llmLatency } from '../utils/metrics.js';
import type { LLMProvider, LLMRequest, LLMResponse } from '../types/index.js';

class LLMService {
  private groq: Groq | null = null;
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private dailyCost = 0;
  private lastCostReset = new Date();

  constructor() {
    if (config.llm.groq.apiKey) {
      this.groq = new Groq({ apiKey: config.llm.groq.apiKey });
    }
    if (config.llm.openai.apiKey) {
      this.openai = new OpenAI({ apiKey: config.llm.openai.apiKey });
    }
    if (config.llm.anthropic.apiKey) {
      this.anthropic = new Anthropic({ apiKey: config.llm.anthropic.apiKey });
    }
  }

  private resetDailyCostIfNeeded() {
    const now = new Date();
    if (now.getDate() !== this.lastCostReset.getDate()) {
      this.dailyCost = 0;
      this.lastCostReset = now;
    }
  }

  private checkBudget(estimatedCost: number): boolean {
    this.resetDailyCostIfNeeded();
    return (this.dailyCost + estimatedCost) <= config.costs.dailyBudget;
  }

  private getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (this.groq) providers.push('groq');
    if (this.openai) providers.push('openai');
    if (this.anthropic) providers.push('anthropic');
    return providers;
  }

  private selectProvider(preferred?: LLMProvider): LLMProvider {
    const available = this.getAvailableProviders();
    if (available.length === 0) {
      throw new Error('No LLM providers configured');
    }
    if (preferred && available.includes(preferred)) {
      return preferred;
    }
    // Default priority: groq (fastest/cheapest) > anthropic > openai
    if (available.includes('groq')) return 'groq';
    if (available.includes('anthropic')) return 'anthropic';
    return 'openai';
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.selectProvider(request.provider);
    const startTime = Date.now();

    try {
      let response: LLMResponse;

      switch (provider) {
        case 'groq':
          response = await this.completeGroq(request);
          break;
        case 'openai':
          response = await this.completeOpenAI(request);
          break;
        case 'anthropic':
          response = await this.completeAnthropic(request);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      // Update metrics
      const duration = (Date.now() - startTime) / 1000;
      llmLatency.observe({ provider }, duration);
      llmTokensUsed.inc({ provider, model: response.model }, response.tokensUsed);
      llmCost.inc({ provider }, response.cost);
      this.dailyCost += response.cost;

      logger.info('LLM completion', {
        provider,
        model: response.model,
        tokens: response.tokensUsed,
        cost: response.cost,
        duration,
      });

      return response;
    } catch (error) {
      logger.error('LLM completion failed', { provider, error });
      
      // Try fallback provider
      const fallback = this.getAvailableProviders().find(p => p !== provider);
      if (fallback) {
        logger.info('Trying fallback provider', { fallback });
        return this.complete({ ...request, provider: fallback });
      }
      
      throw error;
    }
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

  private async completeAnthropic(request: LLMRequest): Promise<LLMResponse> {
    if (!this.anthropic) throw new Error('Anthropic not configured');

    const startTime = Date.now();
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');

    const completion = await this.anthropic.messages.create({
      model: config.llm.anthropic.model,
      max_tokens: request.maxTokens || config.llm.anthropic.maxTokens,
      system: systemMessage?.content,
      messages: otherMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const tokensUsed = completion.usage.input_tokens + completion.usage.output_tokens;
    const cost = (tokensUsed / 1000) * config.llm.anthropic.costPer1kTokens;

    return {
      content: completion.content[0].type === 'text' ? completion.content[0].text : '',
      tokensUsed,
      provider: 'anthropic',
      model: config.llm.anthropic.model,
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
