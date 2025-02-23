import { parse_markdown_blocks } from "./markdown.js";

/**
 * Reads the content of a specific block from the full markdown content.
 *
 * @param {string} content - The full markdown content.
 * @param {string} block_key - The unique key identifying the block.
 * @returns {string} - The content of the specified block.
 * @throws {Error} - If the block_key does not exist.
 */
export function block_read(content, block_key) {
  const blocks = parse_markdown_blocks(content);
  const block_range = blocks[block_key];
  
  if (!block_range) {
    throw new Error(`BLOCK NOT FOUND: No block found with key "${block_key}".`);
  }
  
  const lines = content.split('\n');
  const selected_lines = lines.slice(block_range[0] - 1, block_range[1]);
  const block_content = selected_lines.join('\n');
  return block_content;
}

/**
 * Updates the content of a specific block within the full markdown content.
 *
 * @param {string} content - The full markdown content.
 * @param {string} block_key - The unique key identifying the block.
 * @param {string} new_block_content - The new content to replace the existing block.
 * @returns {string} - The updated full markdown content.
 * @throws {Error} - If the block_key does not exist.
 */
export function block_update(content, block_key, new_block_content) {
  const blocks = parse_markdown_blocks(content);
  const block_range = blocks[block_key];

  if (!block_range) {
    throw new Error(`BLOCK NOT FOUND: No block found with key "${block_key}".`);
  }

  const lines = content.split('\n');

  const updated_lines = [
    ...lines.slice(0, block_range[0] - 1),
    new_block_content,
    ...lines.slice(block_range[1]),
  ];

  const updated_content = updated_lines.join('\n');
  return updated_content;
}

/**
 * Removes a specific block from the full markdown content.
 *
 * @param {string} content - The full markdown content.
 * @param {string} block_key - The unique key identifying the block.
 * @returns {string} - The updated markdown content with the block removed.
 * @throws {Error} - If the block_key does not exist.
 */
export function block_destroy(content, block_key) {
  const blocks = parse_markdown_blocks(content);
  const block_range = blocks[block_key];
  
  if (!block_range) {
    throw new Error(`BLOCK NOT FOUND: No block found with key "${block_key}".`);
  }
  
  const lines = content.split('\n');
  
  const updated_lines = [
    ...lines.slice(0, block_range[0] - 1),
    ...lines.slice(block_range[1]),
  ];
  
  const updated_content = updated_lines.join('\n');
  return updated_content;
}
