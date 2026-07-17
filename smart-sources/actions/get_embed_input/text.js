import { source_get_embed_input_markdown } from './markdown.js';

export const display_name = 'Get text source embed input';

/**
 * Build the canonical embedding input for a plain-text source.
 *
 * @this {import('../../smart_source.js').SmartSource}
 * @param {object} [params={}]
 * @returns {Promise<string>}
 */
export async function source_get_embed_input_text(params = {}) {
  return await source_get_embed_input_markdown.call(this, params);
}
