/**
 * Tests for LLM response schema validation
 */

import { describe, it, expect } from '@jest/globals';
import { parseNamingSuggestion, isValidSuggestion } from '../llm/schema.js';

describe('parseNamingSuggestion', () => {
  it('should parse valid JSON response', () => {
    const json = JSON.stringify({
      oldName: 'data',
      newName: 'userData',
      confidence: 0.95,
      rationale: 'More descriptive name',
      safety: {
        isApiSurface: false,
        shouldAutofix: true,
        reason: 'Local variable',
      },
      alternatives: ['userInfo', 'userProfile'],
    });

    const result = parseNamingSuggestion(json);
    expect(result).not.toBeNull();
    expect(result?.oldName).toBe('data');
    expect(result?.newName).toBe('userData');
    expect(result?.confidence).toBe(0.95);
  });

  it('should handle markdown code blocks', () => {
    const json = '```json\n{"oldName":"x","newName":"count","confidence":0.8,"rationale":"test","safety":{"isApiSurface":false,"shouldAutofix":true,"reason":"test"},"alternatives":["num"]}\n```';

    const result = parseNamingSuggestion(json);
    expect(result).not.toBeNull();
    expect(result?.oldName).toBe('x');
  });

  it('should return null for invalid JSON', () => {
    const result = parseNamingSuggestion('not json');
    expect(result).toBeNull();
  });

  it('should return null for missing required fields', () => {
    const json = JSON.stringify({
      oldName: 'data',
      newName: 'userData',
      // missing confidence
    });

    const result = parseNamingSuggestion(json);
    expect(result).toBeNull();
  });
});

describe('isValidSuggestion', () => {
  const validSuggestion = {
    oldName: 'data',
    newName: 'userData',
    confidence: 0.8,
    rationale: 'More descriptive name for user data',
    safety: {
      isApiSurface: false,
      shouldAutofix: true,
      reason: 'Local variable',
    },
    alternatives: ['userInfo'],
  };

  it('should accept valid suggestions', () => {
    expect(isValidSuggestion(validSuggestion)).toBe(true);
  });

  it('should reject same old and new name', () => {
    const suggestion = { ...validSuggestion, newName: 'data' };
    expect(isValidSuggestion(suggestion)).toBe(false);
  });

  it('should reject low confidence', () => {
    const suggestion = { ...validSuggestion, confidence: 0.2 };
    expect(isValidSuggestion(suggestion)).toBe(false);
  });

  it('should reject short rationale', () => {
    const suggestion = { ...validSuggestion, rationale: 'bad' };
    expect(isValidSuggestion(suggestion)).toBe(false);
  });

  it('should reject invalid identifier names', () => {
    const suggestion = { ...validSuggestion, newName: '123invalid' };
    expect(isValidSuggestion(suggestion)).toBe(false);
  });
});
