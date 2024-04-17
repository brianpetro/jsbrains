const { Adapter } = require("./adapter");

/**
 * ApiAdapter is the base class for all API adapters.
 * It provides the basic functionality for making requests to the API.
 * Implements OpenAI API.
 * @extends Adapter
 * Reqires model_config.request_adapter to be set.
 */
class ApiAdapter extends Adapter {
  /**
   * Counts the number of tokens in the input.
   * Override in child classes to implement third-party token counters.
   * @param {string} input - The input to count tokens for.
   * @returns {number} The number of tokens in the input.
   */
  async count_tokens(input) { return this.estimate_tokens(input); }
  estimate_tokens(input) {
    if(typeof this.adapter?.estimate_tokens === 'function') return this.adapter.estimate_tokens(input);
    if(typeof input === 'object') input = JSON.stringify(input);
    return input.length / 3.7;
  }
  get max_chars() { return (this.max_tokens * 3.7) - 100; }
  async embed(input) {
    if(!input?.length) return console.log("input is empty"); // check if input is empty
    input = this.prepare_embed_input(input);
    const embeddings = await this.request_embedding(input);
    return embeddings[0];
  }
  async embed_batch(items) {
    items = items.filter(item => item.embed_input?.length > 0); // remove items with empty embed_input (causes 400 error)
    if(items.length === 0) return console.log("empty batch (or all items have empty embed_input)");
    const embed_inputs = this.prepare_batch_input(items);
    const embeddings = await this.request_embedding(embed_inputs);
    if(!embeddings) return console.error(items);
    return embeddings.map((embedding, i) => this.parse_embedding_output(embed_inputs, embedding, i));
  }
  parse_embedding_output(embed_inputs, embedding, i) {
    const total_chars = this.count_embed_input_chars(embed_inputs);
    return {
      vec: embedding,
      tokens: Math.round((embed_inputs[i].length / total_chars) * embedding.tokens)
    };
  }

  count_embed_input_chars(embed_inputs) { return embed_inputs.reduce((acc, curr) => acc + curr.length, 0); }

  prepare_batch_input(items) { return items.map(item => this.prepare_embed_input(item.embed_input)); }
  // truncate input using count_tokens, leave room for 100 tokens (buffer)
  prepare_embed_input(embed_input) { return (embed_input.length > this.max_chars) ? embed_input.slice(0, this.max_chars) : embed_input; }

  /**
   * Prepares the request body for embedding.
   * @param {string[]} embed_input - The input to embed.
   * @returns {object} The prepared request body.
   */
  prepare_request_body(embed_input){
    const body = {
      model: this.model_name,
      input: embed_input,
    };
    if (this.model_name.startsWith("text-embedding-3")) {
      body.dimensions = this.dims;
    }
    return body;
  }
  prepare_request_headers() {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.api_key}`
    };
    if (this.headers) headers = { ...headers, ...this.headers };
    return headers;
  }
  /**
   * Requests the embedding from the API.
   * @param {string|string[]} embed_input - The input to embed. May be a string or an array of strings.
   * @returns {object[]} The embedding objects {vec, tokens}
   */
  async request_embedding(embed_input) {
    // Check if embed_input is empty
    if (embed_input.length === 0) {
      console.log("embed_input is empty");
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
      tokens: resp.usage.total_tokens / resp.data.length
    }));
  }
  is_error(resp_json) { return !resp_json.data || !resp_json.usage; }
  async get_resp_json(resp) { return (typeof resp.json === 'function') ? await resp.json() : await resp.json; }
  async request(req, retries = 0){
    try {
      req.throw = false;
      // handle fallback to fetch (allows for overwriting in child classes)
      const resp = this.request_adapter ? await this.request_adapter({url: this.endpoint, ...req}) : await fetch(this.endpoint, req);
      const resp_json = await this.get_resp_json(resp);
      if(this.is_error(resp_json)) throw new Error("Response is erroneous.");
      return resp_json;
    } catch (error) {
      console.log(`Error encountered: ${error.message || error}`);
      return await this.handle_request_err(error, req, retries);
    }
  }
  async handle_request_err(error, req, retries) {
    if (error.status === 429 && retries < 3) {
      const backoff = Math.pow(retries + 1, 2); // exponential backoff
      console.log(`Retrying request (429) in ${backoff} seconds...`);
      await new Promise(r => setTimeout(r, 1000 * backoff));
      return await this.request(req, retries + 1);
    }
    console.error(error);
    return null;
  }
}
exports.ApiAdapter = ApiAdapter;