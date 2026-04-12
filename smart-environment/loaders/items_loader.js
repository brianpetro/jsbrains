import fs from 'fs';
import path from 'path';
import { to_pascal_case } from 'smart-utils/to_pascal_case.js';
import { BaseLoader } from './base.js';
import { ITEM_EXPORT_PROPS } from './constants.js';

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
        const content = fs.readFileSync(abs_path, 'utf-8');

        const meta = {};
        ITEM_EXPORT_PROPS.forEach(export_name => {
          if (this.has_named_export(content, export_name)) {
            meta[export_name] = `${import_var}_${export_name}`;
          }
        });

        this.items[key] = {
          import_var,
          import_path: this.normalize_relative_path(abs_path),
          meta,
          version_literal: this.get_symbol_version_literal(content, import_var)
        };
      });
  }

  get_items() {
    return this.items;
  }

  build_imports() {
    return Object.entries(this.items)
      .sort(([a], [b]) => this.compare_strings(a, b))
      .map(([, { import_var, import_path, meta }]) => {
        const specs = [import_var];

        ITEM_EXPORT_PROPS.forEach(export_name => {
          const import_alias = meta[export_name];
          if (import_alias) {
            specs.push(`${export_name} as ${import_alias}`);
          }
        });

        return `import { ${specs.join(', ')} } from '${import_path}';`;
      })
      .join('\n');
  }

  // build_item_types_config() {
  //   const spacer = ' '.repeat(4);
  //   return Object.entries(this.items)
  //     .sort(([a], [b]) => this.compare_strings(a, b))
  //     .map(([, { import_var }]) => `${spacer}${import_var}`)
  //     .join(',\n');
  // }

  build_items_config(params = {}) {
    const spacer = ' '.repeat(4);
    return Object.entries(this.items)
      .sort(([a], [b]) => this.compare_strings(a, b))
      .map(([key, { import_var, meta, version_literal }]) => {
        const inner = [`class: ${import_var}`];

        ITEM_EXPORT_PROPS.forEach(export_name => {
          if (export_name === 'version') return;
          const import_alias = meta[export_name];
          if (import_alias) {
            inner.push(`${export_name}: ${import_alias}`);
          }
        });

        const version_value = meta.version || version_literal || this.get_default_version_literal(params);
        if (version_value) {
          inner.push(`version: ${version_value}`);
        }

        return `${spacer}${key}: { ${inner.join(', ')} }`;
      })
      .join(',\n');
  }
}
