export class SmartRankAdapter {
  constructor(smart_embed) {
    this.smart_embed = smart_embed;
  }
  async load() { throw new Error("Not implemented"); }
  async rank(query, documents) { throw new Error("Not implemented"); }
}
