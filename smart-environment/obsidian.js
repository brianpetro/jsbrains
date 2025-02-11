import { SmartEnv as BaseSmartEnv } from './smart_env.js';
import { SmartFs } from 'smart-file-system';
import { SmartFsObsidianAdapter } from 'smart-file-system/adapters/obsidian.js';

export class SmartEnv extends BaseSmartEnv {
  get fs() {
    if (!this.smart_fs) {
      this.smart_fs = new SmartFs(this, {
        adapter: SmartFsObsidianAdapter,
        fs_path: this.opts.env_path || '',
      });
    }
    return this.smart_fs;
  }
  get data_fs() {
    if (!this._fs) {
      this._fs = new SmartFs(this, {
        adapter: SmartFsObsidianAdapter,
        fs_path: this.data_fs_path,
      });
    }
    return this._fs;
  }
}
