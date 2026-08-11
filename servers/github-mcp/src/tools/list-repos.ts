/**
 * list_repos — List repositories for a user or organization.
 */

import { z } from 'zod';
import type { Octokit } from '@octokit/rest';

export const listReposSchema = z.object({
  owner: z.string().optional().describe('GitHub username or org. Defaults to authenticated user.'),
  type: z.enum(['all', 'owner', 'member', 'public']).default('all').describe('Filter by repo type'),
  sort: z.enum(['created', 'updated', 'pushed', 'full_name']).default('updated').describe('Sort field'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page (max 100)'),
  page: z.number().min(1).default(1).describe('Page number'),
});

export type ListReposInput = z.infer<typeof listReposSchema>;

export async function listRepos(octokit: Octokit, input: ListReposInput): Promise<string> {
  const { owner, type, sort, per_page, page } = input;

  let repos;
  if (owner) {
    // List repos for a specific user
    const response = await octokit.repos.listForUser({
      username: owner,
      type: type === 'all' ? 'all' : type as 'owner' | 'member',
      sort,
      per_page,
      page,
    });
    repos = response.data;
  } else {
    // List repos for authenticated user
    const response = await octokit.repos.listForAuthenticatedUser({
      type,
      sort,
      per_page,
      page,
    });
    repos = response.data;
  }

  return JSON.stringify({
    count: repos.length,
    page,
    repos: repos.map(r => ({
      full_name: r.full_name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      open_issues: r.open_issues_count,
      visibility: r.visibility,
      updated_at: r.updated_at,
      html_url: r.html_url,
      default_branch: r.default_branch,
    })),
  });
}
