/**
 * search_pages — Search Notion pages and databases by title or content.
 */

import { z } from 'zod';
import { Client } from '@notionhq/client';

export const searchPagesSchema = z.object({
  query: z.string().describe('Search query — matches against page/database titles and content'),
  filter: z.enum(['page', 'database']).optional().describe('Filter results by object type'),
  sort_direction: z.enum(['ascending', 'descending']).default('descending').describe('Sort by last edited time'),
  page_size: z.number().min(1).max(100).default(10).describe('Number of results to return'),
  start_cursor: z.string().optional().describe('Pagination cursor from previous response'),
});

export type SearchPagesInput = z.infer<typeof searchPagesSchema>;

export async function searchPages(notion: Client, input: SearchPagesInput): Promise<string> {
  const { query, filter, sort_direction, page_size, start_cursor } = input;

  const response = await notion.search({
    query,
    filter: filter ? { value: filter, property: 'object' } : undefined,
    sort: {
      direction: sort_direction,
      timestamp: 'last_edited_time',
    },
    page_size,
    start_cursor,
  });

  const results = response.results.map(result => {
    if (result.object === 'page') {
      const page = result as Extract<typeof result, { object: 'page' }>;
      // Extract title from properties
      let title = 'Untitled';
      if ('properties' in page) {
        for (const prop of Object.values(page.properties)) {
          if (prop.type === 'title' && 'title' in prop) {
            const titleParts = (prop as { title: Array<{ plain_text: string }> }).title;
            title = titleParts.map(t => t.plain_text).join('') || 'Untitled';
            break;
          }
        }
      }
      return {
        object: 'page',
        id: page.id,
        title,
        url: page.url,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        parent_type: page.parent.type,
      };
    } else {
      const db = result as Extract<typeof result, { object: 'database' }>;
      return {
        object: 'database',
        id: db.id,
        title: db.title?.map(t => t.plain_text).join('') || 'Untitled',
        url: db.url,
        created_time: db.created_time,
        last_edited_time: db.last_edited_time,
      };
    }
  });

  return JSON.stringify({
    results,
    has_more: response.has_more,
    next_cursor: response.next_cursor,
  });
}
