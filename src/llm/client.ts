/**
 * LLM client with caching and retry logic
 * Uses BlackBox AI API which provides access to OpenAI models
 */

import OpenAI from 'openai';
import { NamingContext, NamingSuggestion, CacheEntry, CostStats } from '../types/index.js';
import { getLLMConfig, calculateCost } from './config.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';
import { parseNamingSuggestion, isValidSuggestion } from './schema.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * In-memory cache for LLM responses
 */
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3600000; // 1 hour

/**
 * Cost tracking
 */
let costStats: CostStats = {
  totalTokens: 0,
  estimatedCost: 0,
  apiCalls: 0,
  cacheHitRate: 0,
};

/**
 * Generate cache key from context
 */
function getCacheKey(context: NamingContext): string {
  const data = `${context.file}:${context.oldName}:${context.declaration}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get cached response if available and not expired
 */
function getCachedResponse(key: string): NamingSuggestion | null {
  const entry = responseCache.get(key);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    responseCache.delete(key);
    return null;
  }

  logger.debug('Cache hit for key:', key.substring(0, 8));
  return entry.suggestion;
}

/**
 * Cache a response
 */
function cacheResponse(key: string, suggestion: NamingSuggestion): void {
  responseCache.set(key, {
    suggestion,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  });
}

/**
 * Sleep for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ask LLM for naming suggestion with retry logic
 * Uses BlackBox AI API (which connects to OpenAI behind the scenes)
 */
export async function askLLM(context: NamingContext): Promise<NamingSuggestion | null> {
  const config = getLLMConfig();
  const cacheKey = getCacheKey(context);

  // Check cache first
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return cached;
  }

  // Initialize OpenAI client with BlackBox AI API key
  const openai = new OpenAI({ apiKey: config.apiKey });
  const userPrompt = buildUserPrompt(context);

  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      logger.debug(`LLM request attempt ${attempt + 1} for ${context.oldName}`);

      const response = await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      // Parse and validate response
      const suggestion = parseNamingSuggestion(content);
      if (!suggestion) {
        throw new Error('Invalid JSON response from LLM');
      }

      if (!isValidSuggestion(suggestion)) {
        logger.warn(`Invalid suggestion for ${context.oldName}: ${suggestion.newName}`);
        return null;
      }

      // Update cost stats
      const usage = response.usage;
      if (usage) {
        costStats.totalTokens += usage.total_tokens;
        costStats.estimatedCost += calculateCost(
          config.model,
          usage.prompt_tokens,
          usage.completion_tokens
        );
      }
      costStats.apiCalls++;

      // Cache the response
      cacheResponse(cacheKey, suggestion);

      logger.info(
        `LLM suggestion for ${context.oldName}: ${suggestion.newName} (confidence: ${suggestion.confidence})`
      );

      return suggestion;
    } catch (error) {
      lastError = error as Error;
      logger.warn(`LLM request failed (attempt ${attempt + 1}): ${lastError.message}`);

      // Exponential backoff before retry
      if (attempt < config.maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.debug(`Retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
      }
    }
  }

  logger.error(`LLM request failed after ${config.maxRetries + 1} attempts: ${lastError?.message}`);
  return null;
}

/**
 * Get current cost statistics
 */
export function getCostStats(): CostStats {
  const totalRequests = costStats.apiCalls + responseCache.size;
  costStats.cacheHitRate = totalRequests > 0 ? responseCache.size / totalRequests : 0;
  return { ...costStats };
}

/**
 * Reset cost statistics
 */
export function resetCostStats(): void {
  costStats = {
    totalTokens: 0,
    estimatedCost: 0,
    apiCalls: 0,
    cacheHitRate: 0,
  };
}

/**
 * Clear response cache
 */
export function clearCache(): void {
  responseCache.clear();
}
