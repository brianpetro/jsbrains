import fs from 'fs';
import path from 'path';

export class BaseLoader {
  constructor({ dist_dir }) {
    this.dist_dir = dist_dir;
  }

  compare_strings(a, b) {
    return a.localeCompare(b);
  }

  normalize_relative_path(abs_path) {
    let rel = path.relative(this.dist_dir, abs_path).replace(/\\/g, '/');
    if (!rel.startsWith('.')) {
      rel = './' + rel;
    }
    return rel;
  }

  read_dir_sorted(dir_path) {
    return fs.readdirSync(dir_path).sort((a, b) => this.compare_strings(a, b));
  }

  validate_file_type(file_name) {
    if (file_name.endsWith('.test.js')) return false;
    if (file_name.endsWith('.spec.js')) return false;
    return file_name.endsWith('.js');
  }

  has_named_export(content, name) {
    if (content.includes(`export function ${name}`)) return true;
    if (content.includes(`export async function ${name}`)) return true;
    if (content.includes(`export const ${name}`)) return true;
    if (content.includes(`export let ${name}`)) return true;
    if (content.includes(`export var ${name}`)) return true;
    const re = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`);
    return re.test(content);
  }

  to_snake_case(value) {
    return value
      .replace(/[.\-\s]+/g, '_')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase();
  }

  sorted_keys(obj) {
    return Object.keys(obj).sort((a, b) => this.compare_strings(a, b));
  }
}
