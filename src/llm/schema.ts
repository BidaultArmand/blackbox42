/**
 * Zod schemas for validating LLM responses
 */

import { z } from 'zod';

/**
 * Safety analysis schema
 */
export const SafetySchema = z.object({
  isApiSurface: z.boolean(),
  shouldAutofix: z.boolean(),
  reason: z.string(),
});

/**
 * Naming suggestion schema
 */
export const NamingSuggestionSchema = z.object({
  oldName: z.string(),
  newName: z.string(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  safety: SafetySchema,
  alternatives: z.array(z.string()).min(1).max(5),
});

/**
 * Parse and validate LLM JSON response
 */
export function parseNamingSuggestion(jsonString: string): z.infer<typeof NamingSuggestionSchema> | null {
  try {
    // Try to extract JSON from markdown code blocks if present
    let cleaned = jsonString.trim();
    
    // Remove markdown code blocks
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }
    
    const parsed = JSON.parse(cleaned);
    return NamingSuggestionSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Schema validation failed:', error.errors);
    } else {
      console.error('JSON parsing failed:', error);
    }
    return null;
  }
}

/**
 * Validate that a suggestion meets quality thresholds
 */
export function isValidSuggestion(suggestion: z.infer<typeof NamingSuggestionSchema>): boolean {
  // Must have different name
  if (suggestion.oldName === suggestion.newName) {
    return false;
  }

  // Must have minimum confidence
  if (suggestion.confidence < 0.3) {
    return false;
  }

  // Must have rationale
  if (!suggestion.rationale || suggestion.rationale.length < 10) {
    return false;
  }

  // New name must be valid identifier
  const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  if (!validIdentifier.test(suggestion.newName)) {
    return false;
  }

  return true;
}
