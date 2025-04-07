#!/usr/bin/env node
/**
 * build_smart_env_config.js
 *
 * Scans ./src for collections, items, and components,
 * generates "dist/smart_env.config.js" with static import statements.
 *
 * Run: `node build_smart_env_config.js`
 */

import fs from 'fs';
import path from 'path';

/**
 * @function build_smart_env_config
 * @description Builds the smart_env.config.js file in dist/
 * @param {string} [directory='src']
 */
export function build_smart_env_config(directory='src') {
  const SMART_ENV_ROOT = path.resolve(process.cwd(), directory);
  const DIST_DIR = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }
  
  const { collections, collections_imports } = scan_collections(SMART_ENV_ROOT);
  const { items, items_imports } = scan_items(SMART_ENV_ROOT);
  const { object: components_obj, imports: components_imports } = scan_components_recursive(path.join(SMART_ENV_ROOT, 'components'));
  
  const collections_config = Object.keys(collections)
    .map(name => `    ${name}`)
    .join(',\n');
  
  const items_config = Object.entries(items)
    .map(([name, var_name]) => `    ${var_name}`)
    .join(',\n');
  
  const components_config = object_to_config_string(components_obj, 2);
  
  const config_object = `
  export const smart_env_config = {
    collections: {
${collections_config}
    },
    item_types: {
${items_config}
    },
    components: {
${components_config}
    }
  };
  `;
  
  const final_code = [
    '// AUTO-GENERATED by build_smart_env_config.js. DO NOT EDIT.',
    ...collections_imports,
    ...items_imports,
    ...components_imports,
    config_object
  ].join('\n');
  
  const out_file = path.join(DIST_DIR, 'smart_env.config.js');
  fs.writeFileSync(out_file, final_code, 'utf-8');
  console.log(`Wrote ${out_file}`);

  //////////////////////////////////////////////////////////
  // Helper methods
  //////////////////////////////////////////////////////////
  
  /**
   * @function scan_collections
   * @description Finds all JS files in src/collections and imports them
   * @param {string} base_dir
   * @returns {{ collections:Record<string, string>, collections_imports:string[] }}
   */
  function scan_collections(base_dir) {
    const collections_dir = path.join(base_dir, 'collections');
    if (!fs.existsSync(collections_dir)) {
      return { collections:{}, collections_imports:[] };
    }
  
    const collections = {};
    const collections_imports = [];
  
    for (const file of fs.readdirSync(collections_dir)) {
      if (!file.endsWith('.js')) continue;
      const coll_name = file.replace('.js', '');
      collections_imports.push(`import ${coll_name} from '${normalize_relative_path(path.join(collections_dir, file))}';`);
      collections[coll_name] = coll_name;
    }
  
    return { collections, collections_imports };
  }
  
  /**
   * @function scan_items
   * @description Finds all JS files in src/items and imports them
   * @param {string} base_dir
   * @returns {{ items:Record<string, string>, items_imports:string[] }}
   */
  function scan_items(base_dir) {
    const items_dir = path.join(base_dir, 'items');
    if (!fs.existsSync(items_dir)) {
      return { items:{}, items_imports:[] };
    }
  
    const items = {};
    const items_imports = [];
  
    for (const file of fs.readdirSync(items_dir)) {
      if (!file.endsWith('.js')) continue;
      const item_name = file.replace('.js', '');
      const import_var = to_pascal_case(item_name);
      items_imports.push(`import { ${import_var} } from '${normalize_relative_path(path.join(items_dir, file))}';`);
      items[item_name] = import_var;
    }
  
    return { items, items_imports };
  }

  /**
   * @function scan_components_recursive
   * @description Recursively scans a directory for JS files to build a nested components object
   * @param {string} dir
   * @returns {{ object:Object, imports:string[] }}
   */
  function scan_components_recursive(dir) {
    if (!fs.existsSync(dir)) {
      return { object:{}, imports:[] };
    }
    const node = {};
    const imports = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
  
    for (const entry of entries) {
      const full_path = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const folder_key = to_snake_case(entry.name);
        const { object: child_object, imports: child_imports } = scan_components_recursive(full_path);
        node[folder_key] = child_object;
        imports.push(...child_imports);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const comp_name = entry.name.replace('.js', '');
        const import_var = `${comp_name}_component`;
        imports.push(`import { render as ${import_var} } from '${normalize_relative_path(full_path)}';`);
        node[comp_name] = import_var;
      }
    }
  
    return { object: node, imports };
  }
  
  /**
   * @function object_to_config_string
   * @description Builds a nested string representation of a JS object for the config
   * @param {Object} obj
   * @param {number} [level=0]
   * @returns {string}
   */
  function object_to_config_string(obj, level=0) {
    const indent = '  '.repeat(level);
    const lines = [];
    for (const [key, val] of Object.entries(obj)) {
      if (val && typeof val === 'object') {
        const sub_obj_str = object_to_config_string(val, level + 1);
        lines.push(`${indent}${key}: {\n${sub_obj_str}\n${indent}}`);
      } else {
        lines.push(`${indent}${key}: ${val}`);
      }
    }
    return lines.join(',\n');
  }
  
  /**
   * @function normalize_relative_path
   * @description Converts an absolute path to a relative path from dist/
   * @param {string} abs_path
   * @returns {string}
   */
  function normalize_relative_path(abs_path) {
    let rel = path.relative(DIST_DIR, abs_path).replace(/\\/g, '/');
    if (!rel.startsWith('.')) {
      rel = './' + rel;
    }
    return rel;
  }
  
  /**
   * @function to_pascal_case
   * @description Converts a string to PascalCase
   * @param {string} name
   * @returns {string}
   */
  function to_pascal_case(name) {
    return name.replace(/(^|_|-)(\w)/g, (_match, _p1, char) => char.toUpperCase());
  }

  /**
   * @function to_snake_case
   * @description Converts a string to snake_case
   * @param {string} str
   * @returns {string}
   */
  function to_snake_case(str) {
    return str
      .replace(/([A-Z])/g, m => `_${m.toLowerCase()}`)
      .replace(/[\s\-]+/g, '_')
      .replace(/__+/g, '_')
      .toLowerCase();
  }
}
