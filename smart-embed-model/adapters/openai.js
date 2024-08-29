import { SmartEmbedAdapter } from "./_adapter.js";
import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from "../cl100k_base.json" with { type: "json" };

export class SmartEmbedOpenAIAdapter extends SmartEmbedAdapter {
  constructor(smart_embed) {
    super(smart_embed);
    this.api_key = smart_embed.opts.api_key;
    this.model_key = smart_embed.opts.model_key || "text-embedding-ada-002";
    this.endpoint = "https://api.openai.com/v1/embeddings";
    this.max_tokens = 8191;  // Default max tokens for OpenAI embeddings
    this.dims = smart_embed.opts.dims || 1536;  // Default dimensions for OpenAI embeddings
    this.enc = null;
    this.request_adapter = smart_embed.env.opts.request_adapter;
  }

  async load() {
    this.enc = new Tiktoken(cl100k_base);
  }

  async count_tokens(input) {
    if (!this.enc) await this.load();
    return this.enc.encode(input).length;
  }

  estimate_tokens(input) {
    if (typeof input === 'object') input = JSON.stringify(input);
    return Math.ceil(input.length / 3.7);
  }

  async embed_batch(inputs) {
    console.log(`Original inputs length: ${inputs.length}`);
    inputs = inputs.filter(item => item.embed_input?.length > 0);
    console.log(`Filtered inputs length: ${inputs.length}`);
    if (inputs.length === 0) {
      console.log("empty batch (or all items have empty embed_input)");
      return [];
    }
    const embed_inputs = await Promise.all(inputs.map(item => this.prepare_embed_input(item.embed_input)));
    console.log(`Prepared embed_inputs length: ${embed_inputs.length}`);
    const embeddings = await this.request_embedding(embed_inputs);
    if (!embeddings) return console.error(inputs);
    return inputs.map((item, i) => {
      item.vec = embeddings[i].vec;
      item.tokens = embeddings[i].tokens;
      return item
    });
  }

  async prepare_embed_input(embed_input) {
    if (typeof embed_input !== 'string') {
      throw new TypeError('embed_input must be a string');
    }

    if (embed_input.length === 0) {
      console.log("Warning: prepare_embed_input received an empty string");
      return null;
    }

    const tokens_ct = await this.count_tokens(embed_input);
    if (tokens_ct <= this.max_tokens) {
      return embed_input;
    }

    const reduce_ratio = (tokens_ct - this.max_tokens) / tokens_ct;
    const new_length = Math.floor(embed_input.length * (1 - reduce_ratio));

    // Trim the input to the new length, ensuring we don't cut off in the middle of a word
    let trimmed_input = embed_input.slice(0, new_length);
    const last_space_index = trimmed_input.lastIndexOf(' ');
    if (last_space_index > 0) {
      trimmed_input = trimmed_input.slice(0, last_space_index);
    }

    // Recursively call prepare_embed_input to ensure we're within token limit
    const prepared_input = await this.prepare_embed_input(trimmed_input);
    if (prepared_input === null) {
      console.log("Warning: prepare_embed_input resulted in an empty string after trimming");
      return null;
    }
    return prepared_input;
  }

  prepare_batch_input(items) {
    return items.map(item => this.prepare_embed_input(item.embed_input));
  }

  prepare_request_body(embed_input) {
    const body = {
      model: this.model_key,
      input: embed_input,
    };
    if (this.model_key.startsWith("text-embedding-3")) {
      body.dimensions = this.dims;
    }
    return body;
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
    return resp.data.map(item => ({
      vec: item.embedding,
      tokens: resp.usage.total_tokens
    }));
  }

  is_error(resp_json) {
    return !resp_json.data || !resp_json.usage;
  }

  async get_resp_json(resp) {
    return (typeof resp.json === 'function') ? await resp.json() : await resp.json;
  }

  async request(req, retries = 0) {
    try {
      req.throw = false;
      const resp = this.request_adapter
        ? await this.request_adapter({ url: this.endpoint, ...req })
        : await fetch(this.endpoint, req);
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
