import { source_get_embed_input_markdown } from './markdown.js';

export const display_name = 'Get data source embed input';

/**
 * Build the canonical embedding input for a source backed by item data.
 *
 * @this {import('../../smart_source.js').SmartSource}
 * @param {object} [params={}]
 * @returns {Promise<string>}
 */
export async function source_get_embed_input_data(params = {}) {
  return await source_get_embed_input_markdown.call(this, params);
}
