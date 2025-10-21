/**
 * Orchestrate building enriched naming context from PR diffs
 */

import { Octokit } from '@octokit/rest';
import { NamingContext, PullRequest, PRDiff } from '../types/index.js';
import { parseDiff, extractIdentifiers } from './diff-parser.js';
import { extractSymbolInfo } from './symbol-extractor.js';
import { logger } from '../utils/logger.js';

/**
 * Build naming contexts for all changed symbols in a PR
 */
export async function buildContextsFromPR(
  octokit: Octokit,
  pr: PullRequest
): Promise<NamingContext[]> {
  logger.info(`Building contexts for PR #${pr.number}`);

  // Get PR files and diffs
  const { data: files } = await octokit.pulls.listFiles({
    owner: pr.owner,
    repo: pr.repo,
    pull_number: pr.number,
    per_page: 100,
  });

  const contexts: NamingContext[] = [];

  for (const file of files) {
    // Skip deleted files
    if (file.status === 'removed') {
      continue;
    }

    // Parse the diff
    const diff = parseDiff(file.patch || '', file.filename);
    if (!diff) {
      continue;
    }

    // Get file content from the PR head
    let fileContent: string;
    try {
      const { data } = await octokit.repos.getContent({
        owner: pr.owner,
        repo: pr.repo,
        path: file.filename,
        ref: pr.head,
      });

      if ('content' in data) {
        fileContent = Buffer.from(data.content, 'base64').toString('utf-8');
      } else {
        logger.warn(`Could not get content for ${file.filename}`);
        continue;
      }
    } catch (error) {
      logger.error(`Error fetching file content: ${error}`);
      continue;
    }

    // Extract identifiers from additions
    const addedCode = diff.additions.map((a) => a.content).join('\n');
    const identifiers = extractIdentifiers(addedCode, diff.language);

    logger.debug(`Found ${identifiers.length} identifiers in ${file.filename}`);

    // Build context for each identifier
    for (const identifier of identifiers) {
      const symbolInfo = await extractSymbolInfo(
        file.filename,
        identifier,
        fileContent,
        diff.language
      );

      if (!symbolInfo) {
        continue;
      }

      // Check if this is a meaningful symbol to review
      if (!shouldReviewSymbol(identifier, symbolInfo.declaration)) {
        continue;
      }

      const context: NamingContext = {
        file: file.filename,
        language: diff.language,
        oldName: identifier,
        declaration: symbolInfo.declaration,
        usages: symbolInfo.usages,
        neighbors: symbolInfo.neighbors,
        enclosingScopes: symbolInfo.enclosingScopes,
        types: symbolInfo.types,
        prTitle: pr.title,
        prBody: pr.body,
        lineNumber: symbolInfo.lineNumber,
      };

      contexts.push(context);
    }
  }

  logger.info(`Built ${contexts.length} naming contexts`);
  return contexts;
}

/**
 * Determine if a symbol should be reviewed
 * Skip common patterns that don't need review
 */
function shouldReviewSymbol(name: string, declaration: string): boolean {
  // Skip very short names (likely loop variables)
  if (name.length <= 2) {
    return false;
  }

  // Skip names that are already well-formed
  const wellFormedPatterns = [
    /^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/, // PascalCase
    /^[a-z]+(?:[A-Z][a-z]+)*$/, // camelCase
    /^[A-Z][A-Z0-9_]*$/, // SCREAMING_SNAKE_CASE
    /^[a-z][a-z0-9_]*$/, // snake_case
  ];

  const isWellFormed = wellFormedPatterns.some((pattern) => pattern.test(name));
  if (isWellFormed && name.length >= 5) {
    // Well-formed and reasonably long - likely doesn't need review
    return false;
  }

  // Skip common test/mock patterns
  const skipPatterns = [
    /^test/i,
    /^mock/i,
    /^stub/i,
    /^fake/i,
    /^dummy/i,
    /^_/,
  ];

  if (skipPatterns.some((pattern) => pattern.test(name))) {
    return false;
  }

  // Skip if declaration looks like a type import
  if (declaration.includes('import') && declaration.includes('type')) {
    return false;
  }

  // Review symbols that are:
  // 1. Short and cryptic (< 5 chars)
  // 2. Generic names (data, info, temp, etc.)
  // 3. Poorly formatted
  const genericNames = new Set([
    'data', 'info', 'temp', 'tmp', 'val', 'value', 'item', 'obj',
    'result', 'res', 'ret', 'output', 'input', 'param', 'arg',
  ]);

  if (genericNames.has(name.toLowerCase())) {
    return true;
  }

  // Review if name is short or has poor formatting
  if (name.length < 5 || /[a-z][A-Z]/.test(name) === false) {
    return true;
  }

  return false;
}

/**
 * Build a single context for testing/debugging
 */
export async function buildSingleContext(
  filePath: string,
  symbolName: string,
  fileContent: string,
  language: 'typescript' | 'javascript' | 'python' | 'go',
  prTitle: string,
  prBody: string
): Promise<NamingContext | null> {
  const symbolInfo = await extractSymbolInfo(filePath, symbolName, fileContent, language);

  if (!symbolInfo) {
    return null;
  }

  return {
    file: filePath,
    language,
    oldName: symbolName,
    declaration: symbolInfo.declaration,
    usages: symbolInfo.usages,
    neighbors: symbolInfo.neighbors,
    enclosingScopes: symbolInfo.enclosingScopes,
    types: symbolInfo.types,
    prTitle,
    prBody,
    lineNumber: symbolInfo.lineNumber,
  };
}
