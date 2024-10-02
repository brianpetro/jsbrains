export class SmartEmbedAdapter {
  constructor(smart_embed) {
    this.smart_embed = smart_embed;
  }
  async load() { throw new Error("Not implemented"); }
  async count_tokens(input) { throw new Error("Not implemented"); }
  async embed(input) { throw new Error("Not implemented"); }
  async embed_batch(input) { throw new Error("Not implemented"); }
  unload() { /* add unload logic here */ }
}
