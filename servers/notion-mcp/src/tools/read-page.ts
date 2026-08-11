/**
 * read_page — Read a Notion page's content (blocks).
 */

import { z } from 'zod';
import { Client } from '@notionhq/client';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';

export const readPageSchema = z.object({
  page_id: z.string().describe('Notion page ID (UUID format, with or without hyphens)'),
  max_blocks: z.number().min(1).max(200).default(100).describe('Maximum number of blocks to retrieve'),
});

export type ReadPageInput = z.infer<typeof readPageSchema>;

/**
 * Extract plain text from rich text arrays.
 */
function richTextToPlain(richText: Array<{ plain_text: string }>): string {
  return richText.map(t => t.plain_text).join('');
}

/**
 * Convert a Notion block to a simplified text representation.
 */
function blockToText(block: BlockObjectResponse): string {
  const type = block.type;

  switch (type) {
    case 'paragraph':
      return richTextToPlain(block.paragraph.rich_text);
    case 'heading_1':
      return `# ${richTextToPlain(block.heading_1.rich_text)}`;
    case 'heading_2':
      return `## ${richTextToPlain(block.heading_2.rich_text)}`;
    case 'heading_3':
      return `### ${richTextToPlain(block.heading_3.rich_text)}`;
    case 'bulleted_list_item':
      return `- ${richTextToPlain(block.bulleted_list_item.rich_text)}`;
    case 'numbered_list_item':
      return `1. ${richTextToPlain(block.numbered_list_item.rich_text)}`;
    case 'to_do':
      return `[${block.to_do.checked ? 'x' : ' '}] ${richTextToPlain(block.to_do.rich_text)}`;
    case 'toggle':
      return `> ${richTextToPlain(block.toggle.rich_text)}`;
    case 'code':
      return `\`\`\`${block.code.language}\n${richTextToPlain(block.code.rich_text)}\n\`\`\``;
    case 'quote':
      return `> ${richTextToPlain(block.quote.rich_text)}`;
    case 'callout':
      return `💡 ${richTextToPlain(block.callout.rich_text)}`;
    case 'divider':
      return '---';
    case 'table_of_contents':
      return '[Table of Contents]';
    case 'bookmark':
      return `🔗 ${block.bookmark.url}`;
    case 'image':
      return `[Image: ${block.image.type === 'external' ? block.image.external.url : 'uploaded file'}]`;
    case 'equation':
      return `$${block.equation.expression}$`;
    default:
      return `[${type} block]`;
  }
}

export async function readPage(notion: Client, input: ReadPageInput): Promise<string> {
  const { page_id, max_blocks } = input;

  // Get page metadata
  const page = await notion.pages.retrieve({ page_id });

  // Get page title
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

  // Get page blocks (content)
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore && blocks.length < max_blocks) {
    const response = await notion.blocks.children.list({
      block_id: page_id,
      start_cursor: cursor,
      page_size: Math.min(100, max_blocks - blocks.length),
    });

    for (const block of response.results) {
      if ('type' in block) {
        blocks.push(block as BlockObjectResponse);
      }
    }

    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  // Convert blocks to text
  const content = blocks.map(blockToText).join('\n\n');

  return JSON.stringify({
    id: page_id,
    title,
    url: 'url' in page ? page.url : null,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
    block_count: blocks.length,
    truncated: hasMore,
    content,
  });
}
