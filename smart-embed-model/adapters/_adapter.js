export class SmartEmbedAdapter {
  constructor(smart_embed) {
    this.smart_embed = smart_embed;
    this.settings = smart_embed.settings;
    this.model_config = smart_embed.model_config;
    this.http_adapter = smart_embed.http_adapter;
  }

  async load() {
    // Implement in subclasses if needed
  }

  async count_tokens(input) {
    throw new Error('count_tokens method not implemented');
  }

  async embed(input) {
    throw new Error('embed method not implemented');
  }

  async embed_batch(inputs) {
    throw new Error('embed_batch method not implemented');
  }

  unload() {
    // Implement in subclasses if needed
  }
}
