import fs from 'fs';
import path from 'path';
import { BaseLoader } from './base.js';
import { ACTION_EXPORT_PROPS } from './constants.js';

export class ActionsLoader extends BaseLoader {
  constructor(options) {
    super(options);
    this.actions_flat = new Map();
    this.actions_config = {};
  }

  scan_root(base_dir) {
    const dir = path.join(base_dir, 'actions');
    if (!fs.existsSync(dir)) return;

    this.walk_actions(dir, []);
  }

  walk_actions(curr_dir, rel_parts) {
    this.read_dir_sorted(curr_dir).forEach(entry => {
      const abs = path.join(curr_dir, entry);
      const stat = fs.statSync(abs);

      if (stat.isDirectory()) {
        this.walk_actions(abs, [...rel_parts, entry]);
        return;
      }

      if (!this.validate_file_type(entry)) return;

      const action_name = entry.replace('.js', '');
      const action_key = this.to_snake_case(action_name);
      const folder_snake = rel_parts.map(part => this.to_snake_case(part));
      const flattened_key = [...folder_snake, action_key].filter(Boolean).join('_');

      const content = fs.readFileSync(abs, 'utf-8');

      const has_file_named_export = this.has_named_export(content, action_name);
      const has_flat_named_export = this.has_named_export(content, flattened_key);

      if (!has_file_named_export && !has_flat_named_export) return;

      const action_export_name = has_flat_named_export ? flattened_key : action_name;
      const action_import_var = [...folder_snake, action_key, 'action'].join('_');
      const import_path = this.normalize_relative_path(abs);

      const meta = {};
      ACTION_EXPORT_PROPS.forEach(export_name => {
        if (this.has_named_export(content, export_name)) {
          meta[export_name] = `${action_import_var}_${export_name}`;
        }
      });

      this.actions_flat.set(action_import_var, {
        action_export_name,
        action_import_var,
        import_path,
        meta
      });

      this.actions_config[flattened_key] = { action_import_var, meta };
    });
  }

  get_actions_flat() {
    return this.actions_flat;
  }

  get_actions_config() {
    return this.actions_config;
  }

  build_imports() {
    const entries = Array.from(this.actions_flat.values()).sort((a, b) =>
      this.compare_strings(a.action_import_var, b.action_import_var)
    );

    return entries
      .map(({ action_export_name, action_import_var, meta, import_path }) => {
        const specs = [`${action_export_name} as ${action_import_var}`];

        ACTION_EXPORT_PROPS.forEach(export_name => {
          const import_var = meta[export_name];
          if (import_var) {
            specs.push(`${export_name} as ${import_var}`);
          }
        });

        return `import { ${specs.join(', ')} } from '${import_path}';`;
      })
      .join('\n');
  }

  build_config() {
    const spacer = ' '.repeat(4);
    return Object.entries(this.actions_config)
      .sort(([a], [b]) => this.compare_strings(a, b))
      .map(([key, value]) => {
        const inner = [`action: ${value.action_import_var}`];
        const meta = value.meta || {};

        ACTION_EXPORT_PROPS.forEach(export_name => {
          const import_var = meta[export_name];
          if (import_var) {
            inner.push(`${export_name}: ${import_var}`);
          }
        });

        return `${spacer}${key}: { ${inner.join(', ')} }`;
      })
      .join(',\n');
  }
}
