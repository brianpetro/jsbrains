const { ApiAdapter } = require("./api");
class LocalApiAdapter extends ApiAdapter {
  async embed(input) {
    const resp = await this.embed_batch([{
      embed_input: input,
    }]);
    return resp?.[0];
  }
  async init() {
    this.endpoint = this.local_endpoint;
  }
  prepare_batch_input(items) {
    return items.map(item => {
      return {
        embed_input: this.prepare_embed_input(item.embed_input),
      }
    });
  }
  parse_embedding_output(embed_inputs, embedding, i) { return embedding; }
  prepare_request_body(input) {
    return {
      model_config: this.main.config,
      input: input,
    };
  }
  prepare_request_headers() {
    return {
      "Content-Type": "application/json",
    };
  }
  is_error(resp) { return resp?.error; }
  parse_response(resp) { return resp; }
}
exports.LocalApiAdapter = LocalApiAdapter;

