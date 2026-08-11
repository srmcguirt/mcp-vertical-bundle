/**
 * create_issue — Create a new GitHub issue.
 */

import { z } from 'zod';
import type { Octokit } from '@octokit/rest';

export const createIssueSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  title: z.string().min(1).describe('Issue title'),
  body: z.string().optional().describe('Issue body (markdown supported)'),
  labels: z.array(z.string()).optional().describe('Labels to apply'),
  assignees: z.array(z.string()).optional().describe('GitHub usernames to assign'),
  milestone: z.number().optional().describe('Milestone number to assign'),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export async function createIssue(octokit: Octokit, input: CreateIssueInput): Promise<string> {
  const { owner, repo, title, body, labels, assignees, milestone } = input;

  const { data: issue } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
    assignees,
    milestone,
  });

  return JSON.stringify({
    number: issue.number,
    title: issue.title,
    state: issue.state,
    html_url: issue.html_url,
    created_at: issue.created_at,
    labels: issue.labels.map(l => (typeof l === 'string' ? l : l.name)),
    assignees: issue.assignees?.map(a => a.login),
  });
}
