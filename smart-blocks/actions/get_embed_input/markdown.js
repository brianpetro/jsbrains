export const display_name = 'Get markdown block embed input';

/**
 * Build the canonical embedding input for a Markdown-like block.
 *
 * @this {import('../../smart_block.js').SmartBlock}
 * @param {object} [params={}]
 * @param {string|null} [params.content]
 * @returns {Promise<string>}
 */
export async function block_get_embed_input_markdown(params = {}) {
  if(typeof this._embed_input !== "string" || !this._embed_input.length){
    let content = params.content;
    if(!content) content = await this.read();
    this._embed_input = this.breadcrumbs + "\n" + content;
  }
  return this._embed_input;
}
