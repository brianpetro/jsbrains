export const display_name = 'Get data source embed input';

/**
 * Build the canonical embedding input for a source backed by item data.
 *
 * @this {import('../../smart_source.js').SmartSource}
 * @param {object} [params={}]
 * @returns {Promise<string>}
 */
export async function source_data_get_embed_input(params = {}) {
  return await this.actions.source_markdown_get_embed_input(params);
}
