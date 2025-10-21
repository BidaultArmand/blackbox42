/**
 * GitHub API client wrapper
 */

import { Octokit } from '@octokit/rest';
import { PullRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Create authenticated Octokit instance
 */
export function createOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  return new Octokit({ auth: token });
}

/**
 * Get PR information from GitHub context
 */
export async function getPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<PullRequest> {
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  return {
    number: pr.number,
    title: pr.title,
    body: pr.body || '',
    base: pr.base.ref,
    head: pr.head.ref,
    isDraft: pr.draft,
    isFork: pr.head.repo?.fork || false,
    labels: pr.labels.map((label) => label.name),
    owner,
    repo,
  };
}

/**
 * Post a review comment on a PR
 */
export async function postReviewComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  path: string,
  line: number,
  body: string
): Promise<void> {
  try {
    await octokit.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      path,
      line,
      body,
      side: 'RIGHT', // Comment on the new version
    });
    logger.info(`Posted comment on ${path}:${line}`);
  } catch (error) {
    logger.error(`Failed to post comment: ${error}`);
    throw error;
  }
}

/**
 * Get existing review comments to avoid duplicates
 */
export async function getExistingComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<Array<{ path: string; line: number; body: string; id: number }>> {
  try {
    const { data: comments } = await octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    return comments.map((comment) => ({
      path: comment.path,
      line: comment.line || comment.original_line || 0,
      body: comment.body,
      id: comment.id,
    }));
  } catch (error) {
    logger.error(`Failed to get existing comments: ${error}`);
    return [];
  }
}

/**
 * Commit changes to PR branch
 */
export async function commitChanges(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  files: Array<{ path: string; content: string }>,
  message: string
): Promise<void> {
  try {
    // Get the current commit SHA
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    const currentCommitSha = ref.object.sha;

    // Get the current tree
    const { data: currentCommit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: currentCommitSha,
    });

    const currentTreeSha = currentCommit.tree.sha;

    // Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        });
        return { path: file.path, sha: blob.sha };
      })
    );

    // Create new tree
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: currentTreeSha,
      tree: blobs.map((blob) => ({
        path: blob.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      })),
    });

    // Create new commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [currentCommitSha],
    });

    // Update reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    logger.info(`Committed changes to ${branch}: ${message}`);
  } catch (error) {
    logger.error(`Failed to commit changes: ${error}`);
    throw error;
  }
}

/**
 * Check if PR is from a fork
 */
export function isForkPR(pr: PullRequest): boolean {
  return pr.isFork;
}

/**
 * Check if PR has a specific label
 */
export function hasLabel(pr: PullRequest, label: string): boolean {
  return pr.labels.includes(label);
}
