import { SmartCompletionAdapter } from "../adapters/_adapter.js";
/**
 * Run completion adapters based on item data properties.
 * @param {Object} params
 * @param {Object} params.item - SmartCompletion item instance
 * @param {Object} params.adapters - map of adapter classes
 * @param {"to_request"|"from_response"} params.hook - method name to invoke
 * @returns {Promise<void>}
 */
export async function run_adapters({ item, adapters, adapter_method }) {
  const data_keys = Object.keys(item.data);
  const entries = Object.entries(adapters).map(([key, AdapterClass]) => ({
    AdapterClass,
    property: AdapterClass.property_name === undefined ? key : AdapterClass.property_name,
    order: AdapterClass.order || 0
  }));
  const applicable = entries
    .filter(({ property }) => property === null || data_keys.includes(property))
    .sort((a, b) => a.order - b.order);
  for (const { AdapterClass } of applicable) {
    if (!(AdapterClass.prototype instanceof SmartCompletionAdapter)) {
      console.warn(`Adapter ${AdapterClass.name} does not extend SmartCompletionAdapter`);
      // continue;
    }
    const adapter = new AdapterClass(item);
    await adapter[adapter_method]?.();
  }
}
