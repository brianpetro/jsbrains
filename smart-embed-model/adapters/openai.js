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
    return { tokens: this.enc.encode(input).length };
  }

  async prepare_embed_input(embed_input) {
    if (typeof embed_input !== 'string') {
      throw new TypeError('embed_input must be a string');
    }
  
    if (embed_input.length === 0) {
      console.log("Warning: prepare_embed_input received an empty string");
      return null;
    }
  
    const {tokens} = await this.count_tokens(embed_input);
    if (tokens <= this.max_tokens) {
      return embed_input;
    }
  
    return await this.trim_input_to_max_tokens(embed_input, tokens);
  }
  
  async trim_input_to_max_tokens(embed_input, tokens_ct) {
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
      model: this.model_config.id,
      input: embed_input,
    };
    if (this.model_key.startsWith("text-embedding-3")) {
      body.dimensions = this.model_config.dims;
    }
    return body;
  }

  parse_response(resp) {
    const avg_tokens = resp.usage.total_tokens / resp.data.length;
    return resp.data.map((item, i, array) => ({
      vec: item.embedding,
      tokens: avg_tokens // not ideal, but OpenAI doesn't return tokens for each embedding in batch requests
    }));
  }

  is_error(resp_json) {
    return !resp_json.data || !resp_json.usage;
  }
  /**
   * Get OpenAI API key
   * @returns {string} OpenAI API key
   */
  get api_key() { return this.settings.openai_api_key; }
  get settings_config() {
    return {
      "openai_api_key": {
        name: 'OpenAI API Key for embeddings',
        type: "password",
        description: "Required for OpenAI embedding models",
        placeholder: "Enter OpenAI API Key",
      },
    }
  }
}
