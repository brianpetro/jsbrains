import { SmartHttpRequestAdapter, SmartHttpResponseAdapter } from './_adapter.js';
/**
 * extends SmartHttpRequestAdapter
 * gets Obsidian's `this.app.vault.adapter.requestUrl` passed as opts.obsidian_request_url to main
 */
export class SmartHttpObsidianRequestAdapter extends SmartHttpRequestAdapter {
	async request(request_params, throw_on_error = false) {
		let response;
		try{
			if (!this.main.opts.obsidian_request_url) {
				throw new Error('obsidian_request_url is required in SmartHttp constructor opts');
			}
			response = await this.main.opts.obsidian_request_url({...request_params, throw: throw_on_error});
			if(throw_on_error && response.status === 400) throw new Error('Obsidian request failed');
			return new SmartHttpObsidianResponseAdapter(response);
		} catch (error) {
			console.error('Error in SmartHttpObsidianRequestAdapter.request():');
			console.error(JSON.stringify(request_params, null, 2));
			console.error(response);
			console.error(error);
			return null;
		}
	}
}

export class SmartHttpObsidianResponseAdapter extends SmartHttpResponseAdapter {
  async status() { return this.response.status; }
  async json() { return await this.response.json; }
  async text() { return await this.response.text; }
  async headers() { return this.response.headers; }
}