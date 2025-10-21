/**
 * Format GitHub review comments with suggestions
 */

import { NamingSuggestion, ReviewComment } from '../types/index.js';
import crypto from 'crypto';

/**
 * Format a naming suggestion as a GitHub comment
 */
export function formatSuggestionComment(
  suggestion: NamingSuggestion,
  filePath: string,
  lineNumber: number,
  includeAutofix: boolean = false
): ReviewComment {
  const confidence = (suggestion.confidence * 100).toFixed(0);
  const confidenceEmoji = suggestion.confidence >= 0.8 ? '🟢' : suggestion.confidence >= 0.5 ? '🟡' : '🔴';

  let body = `## ${confidenceEmoji} Naming Suggestion (${confidence}% confidence)

**Current name:** \`${suggestion.oldName}\`
**Suggested name:** \`${suggestion.newName}\`

**Rationale:** ${suggestion.rationale}

**Safety Analysis:**
- API Surface: ${suggestion.safety.isApiSurface ? '⚠️ Yes' : '✅ No'}
- Auto-fix Safe: ${suggestion.safety.shouldAutofix ? '✅ Yes' : '❌ No'}
- Reason: ${suggestion.safety.reason}

**Alternative names:** ${suggestion.alternatives.map((alt) => `\`${alt}\``).join(', ')}
`;

  // Add GitHub suggested change if appropriate
  if (includeAutofix && suggestion.safety.shouldAutofix) {
    body += `\n\`\`\`suggestion
${suggestion.newName}
\`\`\`\n`;
  }

  // Add deduplication marker
  const hash = generateCommentHash(filePath, suggestion.oldName, suggestion.newName);
  body += `\n<!-- ai-naming-bot:${hash} -->`;

  return {
    path: filePath,
    line: lineNumber,
    body,
    suggestion: includeAutofix && suggestion.safety.shouldAutofix ? suggestion.newName : undefined,
    hash,
  };
}

/**
 * Generate a hash for comment deduplication
 */
export function generateCommentHash(filePath: string, oldName: string, newName: string): string {
  const data = `${filePath}:${oldName}:${newName}`;
  return crypto.createHash('md5').update(data).digest('hex').substring(0, 8);
}

/**
 * Check if a comment already exists (by hash)
 */
export function isCommentDuplicate(
  commentBody: string,
  existingComments: Array<{ body: string }>
): boolean {
  const hashMatch = commentBody.match(/<!-- ai-naming-bot:([a-f0-9]{8}) -->/);
  if (!hashMatch) {
    return false;
  }

  const hash = hashMatch[1];
  return existingComments.some((comment) => comment.body.includes(`ai-naming-bot:${hash}`));
}

/**
 * Format a summary comment for multiple suggestions
 */
export function formatSummaryComment(
  suggestions: NamingSuggestion[],
  autoFixCount: number
): string {
  const totalCount = suggestions.length;
  const highConfidence = suggestions.filter((s) => s.confidence >= 0.8).length;
  const mediumConfidence = suggestions.filter((s) => s.confidence >= 0.5 && s.confidence < 0.8).length;
  const lowConfidence = suggestions.filter((s) => s.confidence < 0.5).length;

  return `## 🤖 AI Naming Review Summary

Found **${totalCount}** naming suggestions:
- 🟢 High confidence (≥80%): ${highConfidence}
- 🟡 Medium confidence (50-79%): ${mediumConfidence}
- 🔴 Low confidence (<50%): ${lowConfidence}

${autoFixCount > 0 ? `✨ **${autoFixCount}** suggestions were automatically applied and committed.` : ''}

Review the inline comments for detailed suggestions.

---
*Powered by AI Naming Reviewer*`;
}

/**
 * Format an error comment
 */
export function formatErrorComment(error: string): string {
  return `## ⚠️ AI Naming Review Error

An error occurred during the naming review:

\`\`\`
${error}
\`\`\`

Please check the action logs for more details.

---
*Powered by AI Naming Reviewer*`;
}

/**
 * Format a "no suggestions" comment
 */
export function formatNoSuggestionsComment(): string {
  return `## ✅ AI Naming Review Complete

No naming improvements suggested. All identifiers appear to follow good naming conventions!

---
*Powered by AI Naming Reviewer*`;
}
