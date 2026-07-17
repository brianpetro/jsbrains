export const display_name = 'Get markdown source embed input';

/**
 * Build the canonical embedding input for a Markdown-like source.
 *
 * @this {import('../../smart_source.js').SmartSource}
 * @param {object} [params={}]
 * @param {string|null} [params.content]
 * @returns {Promise<string>}
 */
export async function source_get_embed_input_markdown(params = {}) {
  if (typeof this._embed_input === 'string' && this._embed_input.length) {
    return this._embed_input; // Return cached (temporary) input
  }

  let content = params.content;
  if(!content) content = await this.read(); // Get content from file
  if(!content || typeof content !== 'string') {
    console.warn('SmartSource.get_embed_input: No content available for embedding: ' + this.path);
    return ''; // No content to embed
  }
  if(this.excluded_lines.length){
    const content_lines = content.split("\n");
    this.excluded_lines.forEach(lines => {
      const {start, end} = lines;
      for(let i = start; i <= end; i++){
        content_lines[i] = "";
      }
    });
    content = content_lines.filter(line => line.length).join("\n");
  }
  const breadcrumbs = this.path.split("/").join(" > ").replace(".md", "");
  const max_tokens = this.collection.embed_model.model.data.max_tokens || 500;
  // Prevent loading too much content
  const max_chars = Math.floor(max_tokens * 3.7); // more conservative estimate for characters
  this._embed_input = `${breadcrumbs}:\n${content}`.substring(0, max_chars);
  return this._embed_input;
}
