import { murmur_hash_32_alphanumeric } from 'smart-utils/create_hash.js';

function parse_component_properties(component_properties = []) {
  const parts = component_properties.filter(Boolean).map(part => part.toString());
  const component_key = parts.pop();
  const scope_key = parts.length ? parts.join('.') : 'global';
  return { scope_key, component_key };
}

async function build_component_data(component_properties, component_module) {
  const { scope_key, component_key } = parse_component_properties(component_properties);
  if (!component_key) return null;
  const render_fn = typeof component_module === 'function'
    ? component_module
    : component_module?.render
  ;
  const version = typeof render_fn?.version === 'number' ? render_fn.version : 0;
  const hash = await murmur_hash_32_alphanumeric(render_fn.toString());
  return { scope_key, component_key, version, hash };
}

/**
 * @class SmartComponentAdapter
 * @description Base adapter responsible for registering and rendering SmartComponents.
 */
export class SmartComponentAdapter {
  constructor(item, component_module) {
    this.item = item;
    this.module = component_module;
    this.item.env.create_env_getter(this);
  }

  static should_use_adapter(component_module) {
    return true;
  }

  static async register_component(collection, component_properties, component_module) {
    if (!this.should_use_adapter(component_module)) return null;
    const data = await build_component_data(component_properties, component_module);
    if (!data) return null;
    const item = await collection.create_or_update({ ...data });
    if (!item) return null;
    item._component_module = component_module;
    item._component_adapter = new this(item, component_module);
    return item;
  }

  /**
   * Render the component for the provided scope.
   * @abstract
   * @param {Object} scope - Render scope from the hosting environment.
   * @param {Object} [opts] - Optional render options.
   * @returns {Promise<*>} Rendered output for the component.
   */
  async render(scope, opts) { // eslint-disable-line no-unused-vars
    throw new Error('render() not implemented');
  }
}