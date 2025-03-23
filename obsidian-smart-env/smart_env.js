import { 
  Notice,
  Platform,
  TFile,
} from 'obsidian';
import { SmartEnv as BaseSmartEnv } from 'smart-environment';
import { merge_env_config } from 'smart-environment/utils/merge_env_config.js';
import default_config from './default.config.js';

export class SmartEnv extends BaseSmartEnv {
  static async create(plugin, main_env_opts = null) {
    if(!main_env_opts) main_env_opts = plugin.smart_env_config;
    // Special handling for old Obsidian smart environments
    // Detect if environment has 'init_main'
    if (plugin.app.plugins.plugins['smart-connections']
        && plugin.app.plugins.plugins['smart-connections'].env
        && !plugin.app.plugins.plugins['smart-connections'].env.constructor.version
    ) {
      const update_notice = "Detected older SmartEnv with 'init_main'. Reloading without the outdated plugin. Please update Smart Connections.";
      // Attempt a user-visible notice if Obsidian's Notice is in scope, otherwise warn:
      console.warn(update_notice);
      new Notice(update_notice, 0);
      disable_plugin(plugin.app, 'smart-connections');
    }

    const opts = merge_env_config(main_env_opts, default_config);
    return await super.create(plugin, opts);
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

async function disable_plugin(app, plugin_id) {
  console.log('disabling plugin', plugin_id);
  await app.plugins.unloadPlugin(plugin_id);
  await app.plugins.disablePluginAndSave(plugin_id);
  await app.plugins.loadManifests();
}