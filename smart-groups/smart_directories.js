import { SmartEntities } from "smart-entities";
import { SmartDirectory } from "./smart_directory.js";
import { render as render_list_component } from "./components/list.js";

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

  get render_list_component() {
    return render_list_component.bind(this.smart_view);
  }
  async render_list(container, opts = {}) {
    const frag = await this.render_list_component(this, opts);
    container.innerHTML = '';
    container.appendChild(frag);
    return container;
  }
}