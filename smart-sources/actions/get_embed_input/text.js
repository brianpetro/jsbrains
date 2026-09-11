export const display_name = 'Get text source embed input';

/**
 * Build the canonical embedding input for a plain-text source.
 *
 * @this {import('../../smart_source.js').SmartSource}
 * @param {object} [params={}]
 * @returns {Promise<string>}
 */
export async function source_text_get_embed_input(params = {}) {
  return await this.actions.source_markdown_get_embed_input(params);
}
