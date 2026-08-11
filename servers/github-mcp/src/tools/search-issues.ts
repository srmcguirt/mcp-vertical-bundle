/**
 * search_issues — Search GitHub issues and pull requests.
 */

import { z } from 'zod';
import type { Octokit } from '@octokit/rest';

export const searchIssuesSchema = z.object({
  query: z.string().describe('Search query. Supports GitHub search syntax (e.g., "is:open label:bug repo:owner/repo")'),
  sort: z.enum(['created', 'updated', 'comments']).default('updated').describe('Sort field'),
  order: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
  per_page: z.number().min(1).max(100).default(20).describe('Results per page'),
  page: z.number().min(1).default(1).describe('Page number'),
});

export type SearchIssuesInput = z.infer<typeof searchIssuesSchema>;

export async function searchIssues(octokit: Octokit, input: SearchIssuesInput): Promise<string> {
  const { query, sort, order, per_page, page } = input;

  const response = await octokit.search.issuesAndPullRequests({
    q: query,
    sort,
    order,
    per_page,
    page,
  });

  return JSON.stringify({
    total_count: response.data.total_count,
    page,
    items: response.data.items.map(item => ({
      number: item.number,
      title: item.title,
      state: item.state,
      is_pr: !!item.pull_request,
      author: item.user?.login,
      labels: item.labels.map(l => (typeof l === 'string' ? l : l.name)),
      comments: item.comments,
      created_at: item.created_at,
      updated_at: item.updated_at,
      html_url: item.html_url,
      body_preview: item.body?.slice(0, 300) ?? null,
      repo: item.repository_url.split('/').slice(-2).join('/'),
    })),
  });
}
