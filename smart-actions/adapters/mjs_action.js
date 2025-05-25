/**
 * @file mjs_action_adapter.js
 * Example MJS (ES module) adapter. Dynamically imports an .mjs file from `actionItem.data.module_path`.
 */
import { pathToFileURL } from 'url';
import { SmartActionAdapter } from './_adapter.js';

export class MjsActionAdapter extends SmartActionAdapter {
  async load() {
    const { file_path } = this.item.data || {};
    if (!file_path) {
      throw new Error(`MjsActionAdapter: No file_path specified for action ${this.item.key}`);
    }
    const file_url = pathToFileURL(file_path).href;
    console.log('MjsActionAdapter: file_url: ' + file_url);
    this.module = await import(file_url);
  }
}