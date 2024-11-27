import { SmartModelAdapter } from "smart-model/adapters/_adapter.js";

export class SmartRankModelAdapter extends SmartModelAdapter {
  constructor(model) {
    super(model);
    this.smart_rank = model;
  }
  async count_tokens(input) { throw new Error("Not implemented"); }
  async rank(query, documents) { throw new Error("Not implemented"); }
}
