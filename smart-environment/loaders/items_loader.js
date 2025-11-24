import fs from 'fs';
import path from 'path';
import { to_pascal_case } from 'smart-utils/to_pascal_case.js';
import { BaseLoader } from './base.js';

export class ItemsLoader extends BaseLoader {
  constructor(options) {
    super(options);
    this.items = {};
  }

  scan_root(base_dir) {
    const dir = path.join(base_dir, 'items');
    if (!fs.existsSync(dir)) return;

    this.read_dir_sorted(dir)
      .filter(file_name => this.validate_file_type(file_name))
      .forEach(file_name => {
        const key = this.to_snake_case(file_name.replace('.js', ''));
        const import_var = to_pascal_case(key);
        const abs_path = path.join(dir, file_name);

        this.items[key] = {
          import_var,
          import_path: this.normalize_relative_path(abs_path)
        };
      });
  }

  get_items() {
    return this.items;
  }

  build_imports() {
    return Object.entries(this.items)
      .sort(([a], [b]) => this.compare_strings(a, b))
      .map(([, { import_var, import_path }]) => `import { ${import_var} } from '${import_path}';`)
      .join('\n');
  }

  build_item_types_config() {
    const spacer = ' '.repeat(4);
    return Object.entries(this.items)
      .sort(([a], [b]) => this.compare_strings(a, b))
      .map(([, { import_var }]) => `${spacer}${import_var}`)
      .join(',\n');
  }

  build_items_config() {
    const spacer = ' '.repeat(4);
    return Object.entries(this.items)
      .sort(([a], [b]) => this.compare_strings(a, b))
      .map(([key, { import_var }]) => `${spacer}${key}: { class: ${import_var} }`)
      .join(',\n');
  }
}
