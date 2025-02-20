import { SmartEnv as BaseSmartEnv } from './smart_env.js';
import { SmartFs } from 'smart-file-system';
import { SmartFsObsidianAdapter } from 'smart-file-system/adapters/obsidian.js';
import { SmartView } from 'smart-view';
import { SmartViewObsidianAdapter } from 'smart-view/adapters/obsidian.js';
// import { SmartNotices } from "../../sc-obsidian/src/smart_notices.js";
// import { Notice } from "obsidian";
import { merge_options } from './utils/merge_options.js';


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
  constructor(opts = {}) {
    opts = merge_options(opts, OBSIDIAN_DEFAULTS);
    super(opts);
  }
}
