/**
 * Main entry point for review-only mode
 * Posts inline comments with naming suggestions
 */

import { createOctokit, getPullRequest, postReviewComment, getExistingComments } from './api-client.js';
import { buildContextsFromPR } from '../context/context-builder.js';
import { askLLM, getCostStats } from '../llm/client.js';
import { formatSuggestionComment, isCommentDuplicate, formatSummaryComment, formatNoSuggestionsComment } from './comment-formatter.js';
import { logger } from '../utils/logger.js';
import { NamingSuggestion } from '../types/index.js';

/**
 * Run naming review on a PR
 */
export async function runReview(): Promise<void> {
  try {
    logger.info('Starting AI naming review...');

    // Get GitHub context from environment
    const owner = process.env.GITHUB_REPOSITORY_OWNER || '';
    const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
    const prNumber = parseInt(process.env.PR_NUMBER || '0', 10);

    if (!owner || !repo || !prNumber) {
      throw new Error('Missing required environment variables: GITHUB_REPOSITORY_OWNER, GITHUB_REPOSITORY, PR_NUMBER');
    }

    const octokit = createOctokit();
    const pr = await getPullRequest(octokit, owner, repo, prNumber);

    logger.info(`Reviewing PR #${pr.number}: ${pr.title}`);

    // Build naming contexts from PR
    const contexts = await buildContextsFromPR(octokit, pr);

    if (contexts.length === 0) {
      logger.info('No symbols to review');
      return;
    }

    logger.info(`Found ${contexts.length} symbols to review`);

    // Get existing comments to avoid duplicates
    const existingComments = await getExistingComments(octokit, owner, repo, prNumber);

    // Get suggestions from LLM
    const suggestions: Array<{ suggestion: NamingSuggestion; context: typeof contexts[0] }> = [];

    for (const context of contexts) {
      const suggestion = await askLLM(context);
      if (suggestion && suggestion.confidence >= 0.3) {
        suggestions.push({ suggestion, context });
      }
    }

    if (suggestions.length === 0) {
      logger.info('No suggestions generated');
      // Post a "no suggestions" comment
      await postReviewComment(
        octokit,
        owner,
        repo,
        prNumber,
        contexts[0].file,
        1,
        formatNoSuggestionsComment()
      );
      return;
    }

    logger.info(`Generated ${suggestions.length} suggestions`);

    // Post inline comments
    let postedCount = 0;
    for (const { suggestion, context } of suggestions) {
      const comment = formatSuggestionComment(
        suggestion,
        context.file,
        context.lineNumber,
        false // Don't include autofix in review-only mode
      );

      // Check for duplicates
      if (isCommentDuplicate(comment.body, existingComments)) {
        logger.debug(`Skipping duplicate comment for ${context.oldName}`);
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
        postedCount++;
      } catch (error) {
        logger.error(`Failed to post comment for ${context.oldName}: ${error}`);
      }
    }

    logger.info(`Posted ${postedCount} review comments`);

    // Log cost stats
    const stats = getCostStats();
    logger.info(`Cost stats: $${stats.estimatedCost.toFixed(4)}, ${stats.totalTokens} tokens, ${stats.apiCalls} API calls`);

  } catch (error) {
    logger.error(`Review failed: ${error}`);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runReview().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
