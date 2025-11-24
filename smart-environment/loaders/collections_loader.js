import fs from 'fs';
import path from 'path';
import { BaseLoader } from './base.js';

export class CollectionsLoader extends BaseLoader {
  constructor(options) {
    super(options);
    this.collections = {};
  }

  scan_root(base_dir) {
    const dir = path.join(base_dir, 'collections');
    if (!fs.existsSync(dir)) return;

    this.read_dir_sorted(dir)
      .filter(file_name => this.validate_file_type(file_name))
      .forEach(file_name => {
        const key = this.to_snake_case(file_name.replace('.js', ''));
        const abs_path = path.join(dir, file_name);
        this.collections[key] = this.normalize_relative_path(abs_path);
      });
  }

  get_collections() {
    return this.collections;
  }

  build_imports() {
    return Object.entries(this.collections)
      .sort(([a], [b]) => this.compare_strings(a, b))
      .map(([key, import_path]) => `import ${key} from '${import_path}';`)
      .join('\n');
  }

  build_config() {
    const spacer = ' '.repeat(4);
    return this.sorted_keys(this.collections)
      .map(key => `${spacer}${key}`)
      .join(',\n');
  }
}
