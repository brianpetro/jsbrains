export class SmartChatAdapter {
  constructor(main) {
    this.main = main;
  }
  async complete(req) { throw new Error("complete not implemented"); }
  async stream(req) { throw new Error("stream not implemented"); }
  async count_tokens(req) { throw new Error("count_tokens not implemented"); }
  async fetch_models(refresh=false) { throw new Error("fetch_models not implemented"); }
}