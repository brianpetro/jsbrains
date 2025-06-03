import { SmartGroups } from "smart-groups";

export class SmartDirectories extends SmartGroups {
  static get defaults() {
    return {
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
    dir.data.env_settings_expanded_view = this.env.settings.smart_view_filter.expanded_view
      ?? this.env.settings.expanded_view // @deprecated
    ;
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
    // Build groups from sources
    await this.group_adapter.build_groups();
    // await this.process_save_queue();
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
    if(container) this.env.smart_view.safe_inner_html(container, 'Loading directories...');
    const frag = await this.env.render_component('directories', this, opts);
    if(container) {
      this.env.smart_view.empty(container);
      container.appendChild(frag);
    }
    return frag;
  }

  // disable embed_model for SmartDirectories
  get embed_model() { return null; }
  async process_embed_queue() {
    console.log("skipping embed queue processing for SmartDirectories");
  }
}