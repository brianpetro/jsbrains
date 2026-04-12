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

  escape_regex(value) {
    return String(value).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  }

  read_balanced_block(content, block_start) {
    if (block_start < 0 || content[block_start] !== '{') return '';

    let depth = 0;
    for (let i = block_start; i < content.length; i += 1) {
      const char = content[i];
      if (char === '{') depth += 1;
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return content.slice(block_start, i + 1);
        }
      }
    }

    return '';
  }

  find_named_class_body(content, class_name) {
    if (!content || !class_name) return '';

    const safe_name = this.escape_regex(class_name);
    const patterns = [
      new RegExp(`\\bclass\\s+${safe_name}\\b[^\\{]*\\{`, 'm'),
      new RegExp(`\\b(?:const|let|var)\\s+${safe_name}\\s*=\\s*class\\b[^\\{]*\\{`, 'm'),
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (!match) continue;

      const block_start = content.indexOf('{', match.index);
      if (block_start === -1) continue;

      const block = this.read_balanced_block(content, block_start);
      if (block) return block;
    }

    return '';
  }

  parse_simple_literal(raw_value) {
    const value = String(raw_value || '').trim();
    if (!value) return undefined;

    if (/^-?\d+(?:\.\d+)?$/.test(value)) {
      return Number(value);
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;

    const quote = value[0];
    if (
      (quote === '\'' || quote === '"' || quote === '`')
      && value[value.length - 1] === quote
    ) {
      const inner = value.slice(1, -1);
      return inner
        .replace(/\\\\/g, '\\')
        .replace(/\\`/g, '`')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, '\'')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
      ;
    }

    return undefined;
  }

  get_symbol_version_literal(content, symbol_name) {
    if (!content || !symbol_name) return null;

    const safe_name = this.escape_regex(symbol_name);
    const assignment_match = content.match(new RegExp(`\\b${safe_name}\\.version\\s*=\\s*([^;\\n]+)`));
    const assignment_value = this.parse_simple_literal(assignment_match?.[1]);
    if (assignment_value !== undefined) {
      return JSON.stringify(assignment_value);
    }

    const class_body = this.find_named_class_body(content, symbol_name);
    if (!class_body) return null;

    const static_field_match = class_body.match(/\bstatic\s+version\s*=\s*([^;\n]+)/);
    const static_field_value = this.parse_simple_literal(static_field_match?.[1]);
    if (static_field_value !== undefined) {
      return JSON.stringify(static_field_value);
    }

    const static_getter_match = class_body.match(/\bstatic\s+get\s+version\s*\(\s*\)\s*\{\s*return\s+([^;\n]+)/);
    const static_getter_value = this.parse_simple_literal(static_getter_match?.[1]);
    if (static_getter_value !== undefined) {
      return JSON.stringify(static_getter_value);
    }

    return null;
  }

  get_default_version_literal(params = {}) {
    if (!Object.prototype.hasOwnProperty.call(params, 'version')) return null;

    const { version } = params;
    if (version === undefined || version === null) return null;

    return JSON.stringify(version);
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
