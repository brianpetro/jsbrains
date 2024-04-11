const { SmartEmbedApiAdapter } = require("./SmartEmbedApiAdapter");
class SmartEmbedConnectApiAdapter extends SmartEmbedApiAdapter {
  get is_smart_connect() { return true; }
  async embed_batch(items) {
    items = items.filter(item => item.embed_input?.length > 0); // remove items with empty embed_input (causes 400 error)
    if(items.length === 0) return console.log("empty batch (or all items have empty embed_input)");
    const max_chars = this.max_tokens * 5; // estimate max chars based on max tokens
    const embed_inputs = items.map(item => {
      if(item.embed_input.length > max_chars) return { embed_input: item.embed_input.slice(0, max_chars) };
      return { embed_input: item.embed_input };
    });
    // console.log(embed_inputs);
    const response = await this.request_embedding(embed_inputs);
    if(!response) console.log(items);
    return items.map((item, i) => {
      item.vec = response[i].vec;
      item.tokens = response[i].tokens;
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
      model_config: this.config,
      input: embed_input,
    };
    // console.log(body);
    const request = {
      url: `http://localhost:37421/embed_batch`,
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        // "Authorization": `Bearer ${this.api_key}`
      }
    };
    try {
      const args = (url_first) ? [request.url, request] : [request];
      const resp = await this.http_request_adapter(...args);
      const json = (typeof resp.json === 'function') ? await resp.json() : await resp.json;
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
exports.SmartEmbedConnectApiAdapter = SmartEmbedConnectApiAdapter;