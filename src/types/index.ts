/**
 * Core type definitions for the AI Naming Reviewer system
 */

export type LanguageType = 'typescript' | 'javascript' | 'python' | 'go';

/**
 * Enriched context about a symbol that needs naming review
 */
export interface NamingContext {
  /** File path relative to repo root */
  file: string;
  /** Programming language */
  language: LanguageType;
  /** Current identifier name */
  oldName: string;
  /** Declaration code snippet */
  declaration: string;
  /** Usage examples from the codebase */
  usages: string[];
  /** Neighboring symbols in the same scope */
  neighbors: string[];
  /** Enclosing scopes (function, class, module) */
  enclosingScopes: string[];
  /** Type information if available */
  types?: Record<string, string>;
  /** PR title for additional context */
  prTitle: string;
  /** PR description for intent understanding */
  prBody: string;
  /** Line number where symbol is declared */
  lineNumber: number;
}

/**
 * LLM-generated naming suggestion with safety metadata
 */
export interface NamingSuggestion {
  /** Original identifier name */
  oldName: string;
  /** Proposed new name */
  newName: string;
  /** Confidence score 0.0 to 1.0 */
  confidence: number;
  /** Human-readable explanation */
  rationale: string;
  /** Safety analysis for auto-fix decisions */
  safety: {
    /** Is this part of public API? */
    isApiSurface: boolean;
    /** Safe to automatically rename? */
    shouldAutofix: boolean;
    /** Explanation of safety decision */
    reason: string;
  };
  /** Alternative name suggestions */
  alternatives: string[];
}

/**
 * Parsed PR diff information
 */
export interface PRDiff {
  /** Changed file path */
  file: string;
  /** Programming language detected */
  language: LanguageType;
  /** Added lines with line numbers */
  additions: Array<{ line: number; content: string }>;
  /** Removed lines with line numbers */
  deletions: Array<{ line: number; content: string }>;
  /** Modified lines with line numbers */
  modifications: Array<{ line: number; content: string }>;
}

/**
 * GitHub PR metadata
 */
export interface PullRequest {
  /** PR number */
  number: number;
  /** PR title */
  title: string;
  /** PR description/body */
  body: string;
  /** Base branch (target) */
  base: string;
  /** Head branch (source) */
  head: string;
  /** Is this a draft PR? */
  isDraft: boolean;
  /** Is this from a fork? */
  isFork: boolean;
  /** PR labels */
  labels: string[];
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
}

/**
 * Configuration for LLM client
 */
export interface LLMConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model name (e.g., gpt-4o-mini) */
  model: string;
  /** Max tokens for completion */
  maxTokens: number;
  /** Temperature for sampling */
  temperature: number;
  /** Max retries on failure */
  maxRetries: number;
}

/**
 * Result of a rename operation
 */
export interface RenameResult {
  /** Was the rename successful? */
  success: boolean;
  /** File path that was modified */
  file: string;
  /** Old symbol name */
  oldName: string;
  /** New symbol name */
  newName: string;
  /** Number of references updated */
  referencesUpdated: number;
  /** Error message if failed */
  error?: string;
}

/**
 * GitHub comment to post
 */
export interface ReviewComment {
  /** File path */
  path: string;
  /** Line number for inline comment */
  line: number;
  /** Comment body (markdown) */
  body: string;
  /** Suggested change (GitHub format) */
  suggestion?: string;
  /** Deduplication hash */
  hash: string;
}

/**
 * Cache entry for LLM responses
 */
export interface CacheEntry {
  /** Cached suggestion */
  suggestion: NamingSuggestion;
  /** Timestamp when cached */
  timestamp: number;
  /** TTL in milliseconds */
  ttl: number;
}

/**
 * Statistics for cost tracking
 */
export interface CostStats {
  /** Total tokens used (prompt + completion) */
  totalTokens: number;
  /** Estimated cost in USD */
  estimatedCost: number;
  /** Number of API calls */
  apiCalls: number;
  /** Cache hit rate */
  cacheHitRate: number;
}
