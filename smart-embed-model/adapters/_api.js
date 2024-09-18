import { SmartHttpRequest } from "smart-http-request";
import { SmartEmbedAdapter } from "./_adapter.js";

export class SmartEmbedModelApiAdapter extends SmartEmbedAdapter {
  constructor(smart_embed) {
    super(smart_embed);
    this.model_key = this.smart_embed.model_key;
    this.model_config = this.smart_embed.model_config;
    this.endpoint = this.model_config.endpoint;
    this.max_tokens = this.model_config.max_tokens;
    this.dims = this.model_config.dims;
  }

  get http_adapter() {
    if (!this._http_adapter) {
      if (this.smart_embed.opts.http_adapter) this._http_adapter = this.smart_embed.opts.http_adapter;
      else this._http_adapter = new SmartHttpRequest();
    }
    return this._http_adapter;
  }

  get api_key() {
    return this.settings.api_key || this.model_config.api_key;
  }

  async count_tokens(input) {
    throw new Error("count_tokens not implemented");
  }

  estimate_tokens(input) {
    if (typeof input === 'object') input = JSON.stringify(input);
    return Math.ceil(input.length / 3.7);
  }

  async embed_batch(inputs) {
    inputs = inputs.filter(item => item.embed_input?.length > 0);
    if (inputs.length === 0) {
      console.log("empty batch (or all items have empty embed_input)");
      return [];
    }
    const embed_inputs = await Promise.all(inputs.map(item => this.prepare_embed_input(item.embed_input)));
    const embeddings = await this.request_embedding(embed_inputs);
    if (!embeddings) return console.error(inputs);
    return inputs.map((item, i) => {
      item.vec = embeddings[i].vec;
      item.tokens = embeddings[i].tokens;
      return item;
    });
  }

  async prepare_embed_input(embed_input) {
    throw new Error("prepare_embed_input not implemented");
  }

  prepare_batch_input(items) {
    return items.map(item => this.prepare_embed_input(item.embed_input));
  }

  prepare_request_body(embed_input) {
    throw new Error("prepare_request_body not implemented");
  }

  prepare_request_headers() {
    let headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.api_key}`
    };
    if (this.smart_embed.opts.headers) {
      headers = { ...headers, ...this.smart_embed.opts.headers };
    }
    return headers;
  }

  async request_embedding(embed_input) {
    embed_input = embed_input.filter(input => input !== null && input.length > 0);
    if (embed_input.length === 0) {
      console.log("embed_input is empty after filtering null and empty strings");
      return null;
    }
    const request = {
      url: this.endpoint,
      method: "POST",
      body: JSON.stringify(this.prepare_request_body(embed_input)),
      headers: this.prepare_request_headers()
    };
    const resp = await this.request(request);
    return this.parse_response(resp);
  }

  parse_response(resp) {
    throw new Error("parse_response not implemented");
  }

  is_error(resp_json) {
    throw new Error("is_error not implemented");
  }

  async get_resp_json(resp) {
    return (typeof resp.json === 'function') ? await resp.json() : await resp.json;
  }

  async request(req, retries = 0) {
    try {
      req.throw = false;
      const resp = await this.http_adapter.request({ url: this.endpoint, ...req });
      const resp_json = await this.get_resp_json(resp);
      if (this.is_error(resp_json)) {
        return await this.handle_request_err(resp_json, req, retries);
      }
      return resp_json;
    } catch (error) {
      return await this.handle_request_err(error, req, retries);
    }
  }

  async handle_request_err(error, req, retries) {
    if (error.status === 429 && retries < 3) {
      const backoff = Math.pow(retries + 1, 2);
      console.log(`Retrying request (429) in ${backoff} seconds...`);
      await new Promise(r => setTimeout(r, 1000 * backoff));
      return await this.request(req, retries + 1);
    }
    console.error(error);
    return null;
  }
}