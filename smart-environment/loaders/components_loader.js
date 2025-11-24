import fs from 'fs';
import path from 'path';
import { BaseLoader } from './base.js';
import { COMPONENT_EXPORT_PROPS } from './constants.js';

export class ComponentsLoader extends BaseLoader {
  constructor(options) {
    super(options);
    this.components_flat = new Map();
    this.components_config = {};
  }

  scan_root(base_dir) {
    const dir = path.join(base_dir, 'components');
    if (!fs.existsSync(dir)) return;

    this.walk_components(dir, []);
  }

  walk_components(curr_dir, rel_parts) {
    this.read_dir_sorted(curr_dir).forEach(entry => {
      const abs = path.join(curr_dir, entry);
      const stat = fs.statSync(abs);

      if (stat.isDirectory()) {
        this.walk_components(abs, [...rel_parts, entry]);
        return;
      }

      if (!this.validate_file_type(entry)) return;

      const content = fs.readFileSync(abs, 'utf-8');
      if (!this.has_named_export(content, 'render')) return;

      const comp_name = entry.replace('.js', '');
      const comp_key = this.to_snake_case(comp_name);
      const folder_snake = rel_parts.map(part => this.to_snake_case(part));
      const render_import_var = [...folder_snake, comp_key, 'component'].join('_');
      const import_path = this.normalize_relative_path(abs);
      const flattened_key = [...folder_snake, comp_key].filter(Boolean).join('_');
      const config_key = flattened_key || comp_key;

      const meta = {};
      COMPONENT_EXPORT_PROPS.forEach(export_name => {
        if (this.has_named_export(content, export_name)) {
          meta[export_name] = `${render_import_var}_${export_name}`;
        }
      });

      this.components_flat.set(render_import_var, {
        render_import_var,
        meta,
        import_path
      });

      this.components_config[config_key] = { render_import_var, meta };
    });
  }

  get_components_flat() {
    return this.components_flat;
  }

  get_components_config() {
    return this.components_config;
  }

  build_imports() {
    const entries = Array.from(this.components_flat.values()).sort((a, b) =>
      this.compare_strings(a.render_import_var, b.render_import_var)
    );

    return entries
      .map(({ render_import_var, meta, import_path }) => {
        const specs = [`render as ${render_import_var}`];

        COMPONENT_EXPORT_PROPS.forEach(export_name => {
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
    return Object.entries(this.components_config)
      .sort(([a], [b]) => this.compare_strings(a, b))
      .map(([key, value]) => {
        const inner = [`render: ${value.render_import_var}`];
        const meta = value.meta || {};

        COMPONENT_EXPORT_PROPS.forEach(export_name => {
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
