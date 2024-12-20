/**
 * @file SourceDirectoryGroupsAdapter.js
 * @description Adapts directory groups by scanning SmartSources to build directory items.
 */

import { GroupCollectionAdapter, GroupItemAdapter } from '../../smart-groups/adapters/_adapter.js';

export class SourceDirectoryGroupsAdapter extends GroupCollectionAdapter {
  /**
   * Build groups by scanning the `smart_sources` collection.
   * For each source, derive its directory path and ensure a SmartDirectory group item exists.
   */
  async build_groups() {
    const source_paths = Object.keys(this.collection.env.smart_sources.items);
    const created_dirs = new Set();

    for (const path of source_paths) {
      const dir_path = path.split('/').slice(0, -1).join('/') + '/';
      await this.ensure_parent_directories(dir_path, created_dirs);
    }
  }

  async ensure_parent_directories(dir_path, created_dirs) {
    const parts = dir_path.split('/').filter(p => p);
    let current_path = '';
    
    for (const part of parts) {
      current_path += part + '/';
      if (!created_dirs.has(current_path)) {
        const existing = this.collection.get(current_path);
        if (!existing) {
          const item = this.collection.create_or_update({ path: current_path });
          // item.init() if needed
        }
        created_dirs.add(current_path);
      }
    }
  }
}

export class SourceDirectoryGroupAdapter extends GroupItemAdapter {
}

export default {
  collection: SourceDirectoryGroupsAdapter,
  item: SourceDirectoryGroupAdapter
};
