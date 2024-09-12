export class SmartChatModelAdapter {
  constructor(main) {
    this.main = main;
  }
  async complete(req) { throw new Error("complete not implemented"); }
  async count_tokens(req) { throw new Error("count_tokens not implemented"); }
  async get_models(refresh=false) { throw new Error("get_models not implemented"); }
  async stream(req) { throw new Error("stream not implemented"); }
  async test_api_key() { throw new Error("test_api_key not implemented"); }
}