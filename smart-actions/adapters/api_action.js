/**
 * @file api_action_adapter.js
 * Example adapter to call a remote API for running the action logic.
 */
import fetch from 'node-fetch'; // or cross-fetch
import { SmartActionAdapter } from './_adapter.js';

export class ApiActionAdapter extends SmartActionAdapter {
  async load() {
    // For a remote API, the "loading" step might be minimal, e.g. verifying credentials
    // or storing the base URL from actionItem.data.
    // For demonstration, do nothing here.
  }

  async run(params) {
    const { api_url } = this.item.data || {};
    if (!api_url) {
      throw new Error(`ApiActionAdapter: No api_url specified for action ${this.item.key}`);
    }
    // Example: POST to remote API
    const resp = await fetch(api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {})
    });
    if (!resp.ok) {
      throw new Error(`${this.constructor.name}: API request failed: ${resp.status} ${await resp.text()}`);
    }
    return await resp.json();
  }

  /**
   * Delegates tool generation to the base adapter.
   * @returns {object|null}
   */
  get as_tool() { return super.as_tool; }
}
