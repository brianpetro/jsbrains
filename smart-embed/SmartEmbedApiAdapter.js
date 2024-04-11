const { SmartEmbed } = require("./SmartEmbed");

class SmartEmbedApiAdapter extends SmartEmbed {
  constructor(model_config, http_request_adapter=null, api_key, opts = {}) {
    super(model_config);
    // this.http_request_adapter = http_request_adapter;
    // this.http_request_adapter = (http_request_adapter || fetch).bind(window);
    if(http_request_adapter) this.http_request_adapter = http_request_adapter;
    else {
      if(typeof fetch === "undefined") throw new Error("http_request_adapter is required when fetch is not available");
      this.http_request_adapter = fetch.bind(window);
      opts.url_first = true;
    }
    this.api_key = api_key;
    this.opts = opts;
  }
}
exports.SmartEmbedApiAdapter = SmartEmbedApiAdapter;
