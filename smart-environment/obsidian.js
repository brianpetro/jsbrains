import { SmartEnv as BaseSmartEnv } from './smart_env.js';
import { SmartFs } from 'smart-file-system';
import { SmartFsObsidianAdapter } from 'smart-file-system/adapters/obsidian.js';
import { SmartView } from 'smart-view';
import { SmartViewObsidianAdapter } from 'smart-view/adapters/obsidian.js';
// import { SmartNotices } from "../../sc-obsidian/src/smart_notices.js";
// import { Notice } from "obsidian";
import { merge_options } from './utils/merge_options.js';
import { TFile } from 'obsidian';

const OBSIDIAN_DEFAULTS = {
  env_path: '',
  modules: {
    smart_fs: {
      class: SmartFs,
      adapter: SmartFsObsidianAdapter,
    },
    smart_view: {
      class: SmartView,
      adapter: SmartViewObsidianAdapter,
    },
    // smart_notices: {
    //   class: SmartNotices,
    //   adapter: Notice,
    // },
  }
};

export class SmartEnv extends BaseSmartEnv {
  static async create(plugin, main_env_opts = {}) {
    const opts = merge_options(main_env_opts, OBSIDIAN_DEFAULTS);
    return await super.create(plugin, opts);
  }
  async init(plugin, main_env_opts = {}) {
    plugin.registerEvent(
      plugin.app.vault.on('create', (file) => {
        if(file instanceof TFile){
          this.smart_sources?.init_file_path(file.path);
          this.smart_sources?.fs.include_file(file.path);
        }
      })
    );
    plugin.registerEvent(
      plugin.app.vault.on('rename', (file) => {
        if(file instanceof TFile){
          this.smart_sources?.init_file_path(file.path);
          this.smart_sources?.fs.include_file(file.path);
        }
      })
    );
    plugin.registerEvent(
      plugin.app.vault.on('modify', (file) => {
        if(file instanceof TFile){
          const source = this.smart_sources?.get(file.path);
          if(source){
            source.queue_import();
            if(this.sources_import_timeout) clearTimeout(this.sources_import_timeout);
            this.sources_import_timeout = setTimeout(() => {
              source.import();
            }, 3000);
          }
        }
      })
    );
    return await super.init(plugin, main_env_opts);
  }
}
