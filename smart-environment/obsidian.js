import { 
  Notice,
  Platform,
  TFile,
} from 'obsidian';
import { SmartEnv as BaseSmartEnv } from './smart_env.js';
import { SmartFs } from 'smart-file-system';
import { SmartFsObsidianAdapter } from 'smart-file-system/adapters/obsidian.js';
import { SmartView } from 'smart-view';
import { SmartViewObsidianAdapter } from 'smart-view/adapters/obsidian.js';
// import { SmartNotices } from "../../sc-obsidian/src/smart_notices.js";
// import { Notice } from "obsidian";
import { merge_env_config } from './utils/merge_env_config.js';
import { SmartSources, SmartSource } from 'smart-sources';
import { AjsonMultiFileSourcesDataAdapter } from "smart-sources/adapters/data/ajson_multi_file.js";
import { ObsidianMarkdownSourceContentAdapter } from "smart-sources/adapters/obsidian_markdown.js";
import { SmartBlocks, SmartBlock } from 'smart-blocks';
import { AjsonMultiFileBlocksDataAdapter } from "smart-blocks/adapters/data/ajson_multi_file.js";
import { MarkdownBlockContentAdapter } from "smart-blocks/adapters/markdown_block.js";
// actions architecture
import smart_block from "smart-blocks/smart_block.js";
import smart_source from "smart-sources/smart_source.js";
import { parse_blocks } from "smart-blocks/content_parsers/parse_blocks.js";
import { SmartNotices } from "smart-notices/smart_notices.js"; // TODO: move to jsbrains

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
    smart_notices: {
      class: SmartNotices,
      adapter: Notice,
    },
  },
  collections: {
    smart_sources: {
      collection_key: 'smart_sources',
      class: SmartSources,
      data_adapter: AjsonMultiFileSourcesDataAdapter,
      source_adapters: {
        "md": ObsidianMarkdownSourceContentAdapter,
        "txt": ObsidianMarkdownSourceContentAdapter,
        // "canvas": MarkdownSourceContentAdapter,
        // "default": MarkdownSourceContentAdapter,
      },
      content_parsers: [
        parse_blocks,
      ],
      process_embed_queue: false,
    },
    smart_blocks: {
      collection_key: 'smart_blocks',
      class: SmartBlocks,
      data_adapter: AjsonMultiFileBlocksDataAdapter,
      block_adapters: {
        "md": MarkdownBlockContentAdapter,
        "txt": MarkdownBlockContentAdapter,
        // "canvas": MarkdownBlockContentAdapter,
      },
    },
  },
  item_types: {
    SmartSource,
    SmartBlock,
  },
  items: {
    smart_source,
    smart_block,
  },
  default_settings: {
    is_obsidian_vault: true,
    smart_blocks: {
      embed_blocks: true,
      min_chars: 200,
    },
    smart_sources: {
      min_chars: 200,
      embed_model: {
        adapter: "transformers",
        transformers: {
          legacy_transformers: false,
          model_key: 'TaylorAI/bge-micro-v2',
        },
      },
    },
    file_exclusions: 'Untitled',
    folder_exclusions: 'smart-chats',
    smart_view_filter: {
      render_markdown: true,
      show_full_path: false,
    },
  },
};

export class SmartEnv extends BaseSmartEnv {
  static async create(plugin, main_env_opts = {}) {
    const opts = merge_env_config(main_env_opts, OBSIDIAN_DEFAULTS);
    return await super.create(plugin, opts);
  }
  get notices() {
    if(!this._notices) this._notices = new SmartNotices(this, Notice);
    return this._notices;
  }
  manual_load() {
    this.manual_load = true;
    
  }
  async load() {
    if(Platform.isMobile && !this.manual_load){
      this.notices.show('load_env');
      return;
    }
    await super.load();
    // register event listeners for file changes after load
    const plugin = this.main;
    plugin.registerEvent(
      plugin.app.vault.on('create', (file) => {
        if(file instanceof TFile && this.smart_sources?.source_adapters?.[file.extension]){
          const source = this.smart_sources?.init_file_path(file.path);
          if(source) this.smart_sources?.fs.include_file(file.path);
        }
      })
    );
    plugin.registerEvent(
      plugin.app.vault.on('rename', (file, old_path) => {
        if(file instanceof TFile && this.smart_sources?.source_adapters?.[file.extension]){
          const source = this.smart_sources?.init_file_path(file.path);
          if(source) this.smart_sources?.fs.include_file(file.path);
        }
        if(old_path){
          const source = this.smart_sources?.get(old_path);
          if(source) {
            source.delete();
            // debounce save queue
            if (this.rename_debounce_timeout) clearTimeout(this.rename_debounce_timeout);
            this.rename_debounce_timeout = setTimeout(() => {
              this.smart_sources?.process_save_queue();
              this.rename_debounce_timeout = null;
            }, 1000);
          }
        }
      })
    );
    plugin.registerEvent(
      plugin.app.vault.on('modify', (file) => {
        if(file instanceof TFile && this.smart_sources?.source_adapters?.[file.extension]){
          const source = this.smart_sources?.get(file.path);
          if(source){
            if(!this.sources_import_timeouts) this.sources_import_timeouts = {};
            if(this.sources_import_timeouts[file.path]) clearTimeout(this.sources_import_timeouts[file.path]);
            this.sources_import_timeouts[file.path] = setTimeout(() => {
              source.import();
            }, 23000);
          }
        }
      })
    );
    plugin.registerEvent(
      plugin.app.vault.on('delete', (file) => {
        if(file instanceof TFile && this.smart_sources?.source_adapters?.[file.extension]){
          delete this.smart_sources?.items[file.path];
        }
      })
    );
  }
}
