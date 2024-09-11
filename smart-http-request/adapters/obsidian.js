import { SmartHttpRequestAdapter, SmartHttpResponseAdapter } from './_adapter.js';
/**
 * extends SmartHttpRequestAdapter
 * gets Obsidian's `this.app.vault.adapter.requestUrl` passed as opts.obsidian_request_url to main
 */
export class SmartHttpObsidianRequestAdapter extends SmartHttpRequestAdapter {
	async request(url, opts) {
		if (!this.main.opts.obsidian_request_url) {
			throw new Error('obsidian_request_url is required in SmartHttp constructor opts');
		}
    const request_url_params = { url, ...opts };
    const response = await this.main.opts.obsidian_request_url(request_url_params);
    return new SmartHttpObsidianResponseAdapter(response);
	}
}

export class SmartHttpObsidianResponseAdapter extends SmartHttpResponseAdapter {
  async status() { return this.response.status; }
  async json() { return await this.response.json; }
  async text() { return await this.response.text; }
  async headers() { return this.response.headers; }
}