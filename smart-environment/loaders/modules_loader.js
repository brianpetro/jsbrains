import fs from 'fs';
import path from 'path';
import { BaseLoader } from './base.js';

export class ModulesLoader extends BaseLoader {
  constructor(options) {
    super(options);
    this.modules = {};
  }

  scan_root(base_dir) {
    const dir = path.join(base_dir, 'modules');
    if (!fs.existsSync(dir)) return;

    this.read_dir_sorted(dir)
      .filter(file_name => this.validate_file_type(file_name))
      .forEach(file_name => {
        const key = this.to_snake_case(file_name.replace('.js', ''));
        const abs_path = path.join(dir, file_name);
        this.modules[key] = this.normalize_relative_path(abs_path);
      });
  }

  get_modules() {
    return this.modules;
  }

  build_imports() {
    return Object.entries(this.modules)
      .sort(([a], [b]) => this.compare_strings(a, b))
      .map(([key, import_path]) => `import ${key} from '${import_path}';`)
      .join('\n');
  }

  build_config() {
    const spacer = ' '.repeat(4);
    return this.sorted_keys(this.modules)
      .map(key => `${spacer}${key}`)
      .join(',\n');
  }
}
