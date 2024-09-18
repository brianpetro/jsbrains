import { SmartEmbedModelApiAdapter } from "./_api.js";
import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from "../cl100k_base.json" assert { type: "json" };

export class SmartEmbedOpenAIAdapter extends SmartEmbedModelApiAdapter {
  constructor(smart_embed) {
    super(smart_embed);
    this.enc = null;
  }

  async load() {
    this.enc = new Tiktoken(cl100k_base);
  }

  async count_tokens(input) {
    if (!this.enc) await this.load();
    return this.enc.encode(input).length;
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

    let trimmed_input = embed_input.slice(0, new_length);
    const last_space_index = trimmed_input.lastIndexOf(' ');
    if (last_space_index > 0) {
      trimmed_input = trimmed_input.slice(0, last_space_index);
    }

    const prepared_input = await this.prepare_embed_input(trimmed_input);
    if (prepared_input === null) {
      console.log("Warning: prepare_embed_input resulted in an empty string after trimming");
      return null;
    }
    return prepared_input;
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

  parse_response(resp) {
    return resp.data.map(item => ({
      vec: item.embedding,
      tokens: resp.usage.total_tokens
    }));
  }

  is_error(resp_json) {
    return !resp_json.data || !resp_json.usage;
  }
}
