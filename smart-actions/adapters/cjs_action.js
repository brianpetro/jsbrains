/**
 * @file cjs_action_adapter.js
 * Example CommonJS (require) adapter. Use a Node.js require() approach to load .cjs modules.
 */
// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);
// import { SmartActionAdapter } from './_adapter.js';

// export class CjsActionAdapter extends SmartActionAdapter {
//   async load() {
//     const { file_path } = this.item.data || {};
//     console.log('CjsActionAdapter: file_path', file_path);
//     if (!file_path) {
//       throw new Error(`CjsActionAdapter: No file_path specified for action ${this.item.key}`);
//     }
//     this.module = require(file_path);
//   }
// }

// ABOVE FAILS WHEN ESBUILD COMPILES TO CJS
import { SmartActionAdapter } from './_adapter.js';
import path from 'path';

export class CjsActionAdapter extends SmartActionAdapter {
  async load() {
    const { file_path } = this.item.data || {};
    console.log('CjsActionAdapter: file_path: ' + file_path);
    if (!file_path) {
      // remove this item from the collection if no file_path is specified
      delete this.collection.items[this.item.key];
      throw new Error(`CjsActionAdapter: No file_path specified for action ${this.item.key}`);
    }
    const resolved_path = path.resolve(__dirname, file_path);
    this.module = require(resolved_path);
  }

  /**
   * Expose tool definition via base adapter.
   * @returns {object|null}
   */
  get as_tool() { return super.as_tool; }
}
