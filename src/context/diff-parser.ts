/**
 * Parse GitHub PR diffs and extract changed files with line information
 */

import { PRDiff, LanguageType } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Detect language from file extension
 */
export function detectLanguage(filePath: string): LanguageType | null {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'go':
      return 'go';
    default:
      return null;
  }
}

/**
 * Parse unified diff format from GitHub API
 * Format: @@ -oldStart,oldLines +newStart,newLines @@
 */
export function parseDiff(diffText: string, filePath: string): PRDiff | null {
  const language = detectLanguage(filePath);
  if (!language) {
    logger.debug(`Skipping unsupported file: ${filePath}`);
    return null;
  }

  const additions: Array<{ line: number; content: string }> = [];
  const deletions: Array<{ line: number; content: string }> = [];
  const modifications: Array<{ line: number; content: string }> = [];

  const lines = diffText.split('\n');
  let currentLine = 0;
  let inHunk = false;

  for (const line of lines) {
    // Parse hunk header: @@ -1,5 +1,6 @@
    if (line.startsWith('@@')) {
      const match = line.match(/\+(\d+)/);
      if (match) {
        currentLine = parseInt(match[1], 10);
        inHunk = true;
      }
      continue;
    }

    if (!inHunk) continue;

    // Added line
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions.push({
        line: currentLine,
        content: line.substring(1),
      });
      currentLine++;
    }
    // Deleted line
    else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions.push({
        line: currentLine,
        content: line.substring(1),
      });
      // Don't increment line number for deletions
    }
    // Context line (unchanged)
    else if (line.startsWith(' ')) {
      currentLine++;
    }
  }

  // Identify modifications (lines that appear in both additions and deletions)
  for (const addition of additions) {
    const matchingDeletion = deletions.find(
      (del) => Math.abs(del.line - addition.line) <= 2
    );
    if (matchingDeletion) {
      modifications.push(addition);
    }
  }

  logger.debug(
    `Parsed diff for ${filePath}: +${additions.length} -${deletions.length} ~${modifications.length}`
  );

  return {
    file: filePath,
    language,
    additions,
    deletions,
    modifications,
  };
}

/**
 * Extract identifier names from code lines using regex
 * This is a simple heuristic - language-specific parsers will refine this
 */
export function extractIdentifiers(code: string, language: LanguageType): string[] {
  const identifiers = new Set<string>();

  // Common patterns across languages
  const patterns: RegExp[] = [];

  switch (language) {
    case 'typescript':
    case 'javascript':
      patterns.push(
        /\b(?:const|let|var|function|class|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
        /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]\s*(?:function|async|\()/g,
        /\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
      );
      break;
    case 'python':
      patterns.push(
        /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
        /\bclass\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
        /([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g
      );
      break;
    case 'go':
      patterns.push(
        /\bfunc\s+(?:\([^)]*\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/g,
        /\btype\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
        /\bvar\s+([a-zA-Z_][a-zA-Z0-9_]*)/g
      );
      break;
  }

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const name = match[1];
      // Filter out common keywords and single-letter names
      if (name.length > 1 && !isCommonKeyword(name)) {
        identifiers.add(name);
      }
    }
  }

  return Array.from(identifiers);
}

/**
 * Check if identifier is a common keyword to ignore
 */
function isCommonKeyword(name: string): boolean {
  const keywords = new Set([
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'return', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super',
    'true', 'false', 'null', 'undefined', 'void', 'typeof', 'instanceof',
    'in', 'of', 'as', 'is', 'from', 'import', 'export', 'default',
    'async', 'await', 'yield', 'get', 'set', 'static', 'public', 'private',
    'protected', 'readonly', 'abstract', 'extends', 'implements',
  ]);
  return keywords.has(name.toLowerCase());
}
