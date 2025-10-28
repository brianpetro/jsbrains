import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { SmartComponent } from './smart_component.js';
import { SmartViewComponentAdapter } from './adapters/smart_view_component_adapter.js';

function flatten_components_config(config, path = [], acc = []) {
  if (!config || typeof config !== 'object') return acc;
  Object.entries(config).forEach(([key, value]) => {
    const next_path = [...path, key];
    if (!value) return;
    if (typeof value === 'function' || typeof value?.render === 'function') {
      acc.push({ properties: next_path, module: value });
      return;
    }
    if (typeof value === 'object') {
      flatten_components_config(value, next_path, acc);
    }
  });
  return acc;
}
/**
 * @class SmartComponents
 * @extends Collection
 */
export class SmartComponents extends Collection {
  static key = 'smart_components';
  static collection_key = 'smart_components';
  collection_key = 'smart_components';

  async init() {
    await this.load_components_from_config();
  }

  get component_adapters() {
    if (Array.isArray(this.opts?.component_adapters)) {
      return this.opts.component_adapters;
    }
    if (this.opts?.component_adapters && typeof this.opts.component_adapters === 'object') {
      return Object.values(this.opts.component_adapters);
    }
    return this.constructor.default_component_adapters || [];
  }

  async load_components_from_config() {
    const records = flatten_components_config(this.env.config?.components || {});
    for (const record of records) {
      await this.register_component(record.properties, record.module);
    }
  }

  async register_component(component_properties, component_module) {
    for (const AdapterClass of this.component_adapters) {
      const item = await AdapterClass.register_component(this, component_properties, component_module);
      if (item) return item;
    }
    return null;
  }

  async render_component(component_key, scope, opts = {}) {
    const components = this
      .filter((item) => {
        if( item.key.startsWith(component_key + '#') ) return true;
        return item.component_key === component_key;
      })
      // sort by matching scope key first (best match first)
      .sort((a, b) => {
        const a_scope_match = a.scope_key === scope.key ? 1 : 0;
        const b_scope_match = b.scope_key === scope.key ? 1 : 0;
        return b_scope_match - a_scope_match;
      })
    ;
    // console.log('matching components for', component_key, 'in scope', scope.key, components);
    if (components.length === 0) {
      throw new Error(`SmartComponents: no component found for key ${component_key}`);
    }
    const selected_component = components[0];
    return await selected_component.render(scope, opts);
  }
}

export default {
  class: SmartComponents,
  item_type: SmartComponent,
  data_adapter: ajson_single_file_data_adapter,
  component_adapters: {
    SmartViewComponentAdapter,
  },
};
