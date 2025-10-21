/**
 * Main entry point for autofix mode
 * Applies safe renames and commits changes
 */

import { createOctokit, getPullRequest, postReviewComment, getExistingComments, commitChanges, isForkPR, hasLabel } from './api-client.js';
import { buildContextsFromPR } from '../context/context-builder.js';
import { askLLM, getCostStats } from '../llm/client.js';
import { performSafeRename, shouldAutoRename } from '../rename/rename-orchestrator.js';
import { formatSuggestionComment, isCommentDuplicate, formatSummaryComment } from './comment-formatter.js';
import { logger } from '../utils/logger.js';
import { NamingSuggestion, RenameResult } from '../types/index.js';
import fs from 'fs/promises';

const AUTOFIX_LABEL = 'auto-naming-fix';

/**
 * Run autofix on a PR
 */
export async function runAutofix(): Promise<void> {
  try {
    logger.info('Starting AI naming autofix...');

    // Get GitHub context from environment
    const owner = process.env.GITHUB_REPOSITORY_OWNER || '';
    const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
    const prNumber = parseInt(process.env.PR_NUMBER || '0', 10);

    if (!owner || !repo || !prNumber) {
      throw new Error('Missing required environment variables');
    }

    const octokit = createOctokit();
    const pr = await getPullRequest(octokit, owner, repo, prNumber);

    logger.info(`Autofixing PR #${pr.number}: ${pr.title}`);

    // Security check: Never autofix fork PRs
    if (isForkPR(pr)) {
      logger.warn('Skipping autofix for fork PR (security policy)');
      await postReviewComment(
        octokit,
        owner,
        repo,
        prNumber,
        'README.md',
        1,
        '⚠️ **Autofix skipped**: This PR is from a fork. For security reasons, automatic fixes are only applied to same-repository PRs.'
      );
      return;
    }

    // Check for autofix label
    if (!hasLabel(pr, AUTOFIX_LABEL)) {
      logger.info(`PR does not have '${AUTOFIX_LABEL}' label, skipping autofix`);
      return;
    }

    // Build naming contexts
    const contexts = await buildContextsFromPR(octokit, pr);

    if (contexts.length === 0) {
      logger.info('No symbols to review');
      return;
    }

    logger.info(`Found ${contexts.length} symbols to review`);

    // Get existing comments
    const existingComments = await getExistingComments(octokit, owner, repo, prNumber);

    // Get suggestions and filter for autofix
    const allSuggestions: Array<{ suggestion: NamingSuggestion; context: typeof contexts[0] }> = [];
    const autofixSuggestions: Array<{ suggestion: NamingSuggestion; context: typeof contexts[0] }> = [];

    for (const context of contexts) {
      const suggestion = await askLLM(context);
      if (suggestion && suggestion.confidence >= 0.3) {
        allSuggestions.push({ suggestion, context });

        if (shouldAutoRename(suggestion)) {
          autofixSuggestions.push({ suggestion, context });
        }
      }
    }

    logger.info(`Generated ${allSuggestions.length} suggestions, ${autofixSuggestions.length} eligible for autofix`);

    // Apply autofixes
    const renameResults: RenameResult[] = [];
    const modifiedFiles = new Map<string, string>();

    for (const { suggestion, context } of autofixSuggestions) {
      logger.info(`Applying autofix: ${context.oldName} -> ${suggestion.newName} in ${context.file}`);

      const result = await performSafeRename(
        context.file,
        suggestion,
        context.language,
        context.lineNumber,
        '.'
      );

      renameResults.push(result);

      if (result.success) {
        // Read the modified file content
        const content = await fs.readFile(context.file, 'utf-8');
        modifiedFiles.set(context.file, content);
      } else {
        logger.warn(`Autofix failed for ${context.oldName}: ${result.error}`);
      }
    }

    const successfulRenames = renameResults.filter((r) => r.success);
    logger.info(`Successfully applied ${successfulRenames.length}/${autofixSuggestions.length} autofixes`);

    // Commit changes if any
    if (modifiedFiles.size > 0) {
      const files = Array.from(modifiedFiles.entries()).map(([path, content]) => ({
        path,
        content,
      }));

      const commitMessage = `🤖 AI Naming: Auto-fix ${successfulRenames.length} naming improvement${successfulRenames.length !== 1 ? 's' : ''}

${successfulRenames.map((r) => `- ${r.oldName} → ${r.newName} (${r.file})`).join('\n')}

Applied by AI Naming Reviewer`;

      await commitChanges(octokit, owner, repo, pr.head, files, commitMessage);
      logger.info('Changes committed successfully');
    }

    // Post comments for all suggestions (including non-autofixed)
    let commentCount = 0;
    for (const { suggestion, context } of allSuggestions) {
      const wasAutofixed = successfulRenames.some(
        (r) => r.oldName === suggestion.oldName && r.file === context.file
      );

      const comment = formatSuggestionComment(
        suggestion,
        context.file,
        context.lineNumber,
        !wasAutofixed // Include suggestion only if not autofixed
      );

      // Add autofix status to comment
      if (wasAutofixed) {
        comment.body = `✅ **Auto-fixed and committed**\n\n${comment.body}`;
      }

      if (isCommentDuplicate(comment.body, existingComments)) {
        continue;
      }

      try {
        await postReviewComment(
          octokit,
          owner,
          repo,
          prNumber,
          comment.path,
          comment.line,
          comment.body
        );
        commentCount++;
      } catch (error) {
        logger.error(`Failed to post comment: ${error}`);
      }
    }

    logger.info(`Posted ${commentCount} comments`);

    // Post summary comment
    const summaryComment = formatSummaryComment(
      allSuggestions.map((s) => s.suggestion),
      successfulRenames.length
    );

    await postReviewComment(
      octokit,
      owner,
      repo,
      prNumber,
      contexts[0].file,
      1,
      summaryComment
    );

    // Log cost stats
    const stats = getCostStats();
    logger.info(`Cost stats: $${stats.estimatedCost.toFixed(4)}, ${stats.totalTokens} tokens`);

  } catch (error) {
    logger.error(`Autofix failed: ${error}`);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAutofix().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
