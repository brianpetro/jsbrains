const { SmartEmbedApiAdapter } = require("./SmartEmbedApiAdapter");

const { getEncoding } = require("js-tiktoken");
class SmartEmbedOpenAIAdapter extends SmartEmbedApiAdapter {
  constructor(model_config_key, http_request_adapter, api_key, opts = {}) {
    super(model_config_key, http_request_adapter, api_key, opts);
    this.tokenizer = getEncoding("cl100k_base");
  }
  count_tokens(input) { return this.tokenizer.encode(input).length; }
  async embed(input) {
    if(!input?.length) return console.log("input is empty"); // check if input is empty
    const embedding = {};
    embedding.total_tokens = this.count_tokens(input);
    if(embedding.total_tokens > this.max_tokens){
      // truncate input
      const truncated_input = this.tokenizer.decode(this.tokenizer.encode(input).slice(0, this.max_tokens - 10)); // leave room for 10 tokens (buffer)
      console.log(`input truncated to ${this.max_tokens} tokens`);
      input = truncated_input;
    }
    const response = await this.request_embedding(input);
    embedding.vec = response.data[0].embedding;
    embedding.tokens = response.usage.total_tokens;
    return embedding;
  }
  async embed_batch(items) {
    items = items.filter(item => item.embed_input?.length > 0); // remove items with empty embed_input (causes 400 error)
    if(items.length === 0) return console.log("empty batch (or all items have empty embed_input)");
    const embed_inputs = items.map(item => {
      item.total_tokens = this.count_tokens(item.embed_input);
      if(item.total_tokens < this.max_tokens) return item.embed_input;
      console.log("total tokens exceeds max_tokens", item.total_tokens);
      const truncated_input = this.tokenizer.decode(this.tokenizer.encode(item.embed_input).slice(0, this.max_tokens - 20)) + '...'; // leave room for 200 tokens (buffer)
      return truncated_input;
    });
    const response = await this.request_embedding(embed_inputs);
    if(!response) {
      console.log(items);
    }
    const total_tokens = response.usage.total_tokens;
    const total_chars = items.reduce((acc, item) => acc + item.embed_input.length, 0);
    return items.map((item, i) => {
      item.vec = response.data[i].embedding;
      item.tokens = Math.round((item.embed_input.length / total_chars) * total_tokens);
      return item;
    });
  }
  async request_embedding(embed_input, retries = 0) {
    const {
      url_first,
    } = this.opts;
    // check if embed_input is empty
    if (embed_input.length === 0) {
      console.log("embed_input is empty");
      return null;
    }
    const body = {
      model: this.model_name,
      input: embed_input,
    };
    if (this.model_name.startsWith("text-embedding-3")) {
      body.dimensions = this.dims;
    }
    const request = {
      url: `https://api.openai.com/v1/embeddings`,
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.api_key}`
      }
    };
    try {
      const args = (url_first) ? [request.url, request] : [request];
      const resp = await this.http_request_adapter(...args);
      const json = (typeof resp.json === 'function') ? await resp.json() : await resp.json;
      if (!json.data) throw resp; // OpenAI specific
      if (!json.usage) throw resp; // OpenAI specific
      return json;
    } catch (error) {
      // retry request if error is 429
      if ((error.status === 429) && (retries < 3)) {
        const backoff = Math.pow(retries + 1, 2); // exponential backoff
        console.log(`retrying request (429) in ${backoff} seconds...`);
        await new Promise(r => setTimeout(r, 1000 * backoff));
        return await this.request_embedding(embed_input, retries + 1);
      }
      console.log(error);
      return null;
    }
  }
}
exports.SmartEmbedOpenAIAdapter = SmartEmbedOpenAIAdapter;