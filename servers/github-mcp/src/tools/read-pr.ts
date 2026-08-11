/**
 * read_pr — Get detailed information about a pull request including diff stats.
 */

import { z } from 'zod';
import type { Octokit } from '@octokit/rest';

export const readPrSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  include_files: z.boolean().default(true).describe('Include list of changed files'),
  include_reviews: z.boolean().default(false).describe('Include review comments'),
});

export type ReadPrInput = z.infer<typeof readPrSchema>;

export async function readPr(octokit: Octokit, input: ReadPrInput): Promise<string> {
  const { owner, repo, pull_number, include_files, include_reviews } = input;

  // Get PR details
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
  });

  const result: Record<string, unknown> = {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: pr.draft,
    author: pr.user?.login,
    base: pr.base.ref,
    head: pr.head.ref,
    mergeable: pr.mergeable,
    merged: pr.merged,
    merge_commit_sha: pr.merge_commit_sha,
    additions: pr.additions,
    deletions: pr.deletions,
    changed_files: pr.changed_files,
    comments: pr.comments,
    review_comments: pr.review_comments,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    html_url: pr.html_url,
    body: pr.body,
    labels: pr.labels.map(l => l.name),
    requested_reviewers: pr.requested_reviewers?.map(r => ('login' in r ? r.login : (r as { name?: string }).name)),
  };

  // Optionally include changed files
  if (include_files) {
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number,
      per_page: 100,
    });

    result['files'] = files.map(f => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch_preview: f.patch?.slice(0, 500),
    }));
  }

  // Optionally include reviews
  if (include_reviews) {
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number,
    });

    result['reviews'] = reviews.map(r => ({
      user: r.user?.login,
      state: r.state,
      body: r.body,
      submitted_at: r.submitted_at,
    }));
  }

  return JSON.stringify(result);
}
