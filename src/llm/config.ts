/**
 * LLM configuration and defaults
 * Uses BlackBox AI API which provides access to various LLM models
 */

import { LLMConfig } from '../types/index.js';

/**
 * Get LLM configuration from environment variables
 */
export function getLLMConfig(): LLMConfig {
  const apiKey = process.env.BLACKBOX_API_KEY;
  if (!apiKey) {
    throw new Error('BLACKBOX_API_KEY environment variable is required');
  }

  return {
    apiKey,
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '2', 10),
  };
}

/**
 * Model pricing (per 1M tokens)
 * Powered by BlackBox AI
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
};

/**
 * Calculate estimated cost for token usage
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
