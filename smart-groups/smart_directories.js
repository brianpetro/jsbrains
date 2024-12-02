import { SmartEntities } from "smart-entities";
import { SmartDirectory } from "./smart_directory.js";
import { render as render_directories_component } from "./components/directories.js";

export class SmartDirectories extends SmartEntities {
  static get defaults() {
    return {
      item_type: SmartDirectory,
      collection_key: 'smart_directories',
    };
  }

  /**
   * Creates a directory if it doesn't exist
   */
  async ensure_directory(path) {
    path = path.replace(/\\/g, "/");
    if (!path.endsWith('/')) path += '/';
    
    let dir = this.get(path);
    if (!dir) {
      dir = await this.create_or_update({ path });
      await dir.init();
    }

    // Set initial expanded/collapsed state based on settings
    dir.data.env_settings_expanded_view = this.env.settings.expanded_view;
    return dir;
  }

  /**
   * Gets or creates parent directories recursively
   */
  async ensure_parent_directories(path) {
    const parts = path.split('/').filter(p => p);
    let current_path = '';
    
    for (const part of parts) {
      current_path += part + '/';
      await this.ensure_directory(current_path);
    }
  }

  /**
   * Initializes directories based on existing sources
   */
  async init() {
    await super.init();
    
    // Create directories for all source paths
    const source_paths = Object.keys(this.env.smart_sources.items);
    for (const path of source_paths) {
      const dir_path = path.split('/').slice(0, -1).join('/') + '/';
      await this.ensure_parent_directories(dir_path);
    }
  }

  /**
   * Updates directory metadata when sources change
   */
  async update_directory_metadata(dir_path) {
    const dir = await this.ensure_directory(dir_path);
    dir.data.median_vec = null; // Force recalculation
    dir.data.median_block_vec = null;
    dir.queue_save();
  }

  async render_directories(container, opts = {}) {
    opts.expanded_view = this.env.settings.expanded_view; // Pass the current state
    if(container) container.innerHTML = 'Loading directories...';
    const frag = await this.env.render_component('directories', this, opts);
    if(container) {
      container.innerHTML = '';
      container.appendChild(frag);
    }
    return frag;
  }
}