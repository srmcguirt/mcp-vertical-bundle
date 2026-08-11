/**
 * get_file_contents — Read a file or directory listing from a GitHub repository.
 */

import { z } from 'zod';
import type { Octokit } from '@octokit/rest';

export const getFileContentsSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  path: z.string().default('').describe('Path to file or directory. Empty string for repo root.'),
  ref: z.string().optional().describe('Git ref (branch, tag, or commit SHA). Defaults to the default branch.'),
});

export type GetFileContentsInput = z.infer<typeof getFileContentsSchema>;

export async function getFileContents(octokit: Octokit, input: GetFileContentsInput): Promise<string> {
  const { owner, repo, path, ref } = input;

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  // Directory listing
  if (Array.isArray(data)) {
    return JSON.stringify({
      type: 'directory',
      path: path || '/',
      entries: data.map(entry => ({
        name: entry.name,
        path: entry.path,
        type: entry.type,
        size: entry.size,
        sha: entry.sha,
        html_url: entry.html_url,
      })),
    });
  }

  // Single file
  if (data.type === 'file') {
    let content: string | null = null;

    if ('content' in data && data.content) {
      // Decode base64 content
      content = Buffer.from(data.content, 'base64').toString('utf-8');
    }

    return JSON.stringify({
      type: 'file',
      name: data.name,
      path: data.path,
      size: data.size,
      sha: data.sha,
      encoding: data.encoding,
      html_url: data.html_url,
      content,
    });
  }

  // Submodule or symlink
  return JSON.stringify({
    type: data.type,
    name: data.name,
    path: data.path,
    sha: data.sha,
    html_url: data.html_url,
  });
}
