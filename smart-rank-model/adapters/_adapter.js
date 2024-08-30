export class SmartRankAdapter {
  constructor(smart_rank) {
    this.smart_rank = smart_rank;
  }
  async load() { throw new Error("Not implemented"); }
  async rank(query, documents) { throw new Error("Not implemented"); }
}
