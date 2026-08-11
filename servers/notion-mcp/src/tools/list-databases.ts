/**
 * list_databases — List Notion databases the integration has access to.
 */

import { z } from 'zod';
import { Client } from '@notionhq/client';

export const listDatabasesSchema = z.object({
  page_size: z.number().min(1).max(100).default(10).describe('Number of databases to return'),
  start_cursor: z.string().optional().describe('Pagination cursor from previous response'),
});

export type ListDatabasesInput = z.infer<typeof listDatabasesSchema>;

export async function listDatabases(notion: Client, input: ListDatabasesInput): Promise<string> {
  const { page_size, start_cursor } = input;

  // Search specifically for databases
  const response = await notion.search({
    filter: { value: 'database', property: 'object' },
    sort: { direction: 'descending', timestamp: 'last_edited_time' },
    page_size,
    start_cursor,
  });

  const databases = response.results.map(result => {
    if (result.object !== 'database' || !('title' in result)) {
      return { id: result.id, object: result.object };
    }

    const db = result as Extract<typeof result, { object: 'database' }>;

    // Extract property schema
    const propertySchema: Record<string, string> = {};
    if ('properties' in db) {
      for (const [key, prop] of Object.entries(db.properties)) {
        propertySchema[key] = prop.type;
      }
    }

    return {
      id: db.id,
      title: db.title?.map(t => t.plain_text).join('') || 'Untitled',
      url: db.url,
      created_time: db.created_time,
      last_edited_time: db.last_edited_time,
      properties: propertySchema,
    };
  });

  return JSON.stringify({
    databases,
    has_more: response.has_more,
    next_cursor: response.next_cursor,
  });
}
