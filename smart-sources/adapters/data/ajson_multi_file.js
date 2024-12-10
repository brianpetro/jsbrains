import { AjsonMultiFileCollectionDataAdapter } from "smart-collections/adapters/ajson_multi_file.js";

/**
 * Maps collection class names to their corresponding collection keys.
 * Used to route data entries to the correct collection from a loaded AJSON file.
 * @type {Object.<string, string>}
 * @const
 */
const class_to_collection_key = {
  'SmartSource': 'smart_sources',
  'SmartNote': 'smart_sources', // DEPRECATED: added for backward compatibility
  'SmartBlock': 'smart_blocks',
  'SmartDirectory': 'smart_directories',
};

export class AjsonMultiFileSourceDataAdapter extends AjsonMultiFileCollectionDataAdapter {
  /**
   * Override _process_parsed_entries to handle cross-collection loading specific to sources
   * @override
   */
  _process_parsed_entries(parsed_data, item, rebuilt_ajson) {
    for (const [ajson_key, value] of Object.entries(parsed_data)) {
      if (!value) {
        // Skip null (deleted) entries
        continue;
      }

      // Build each line again for consistency
      rebuilt_ajson.push(`${JSON.stringify(ajson_key)}: ${JSON.stringify(value)},`);

      // Parse the AJSON key structure: ClassName:entity_key
      const [class_name, ...key_parts] = ajson_key.split(":");
      const entity_key = key_parts.join(":"); // Remainder of the string after class name

      if (entity_key === item.key) {
        // Assign data to the current item
        item.data = value;
      } else {
        // Attempt to load into another collection if class_name known
        const target_collection = class_to_collection_key[class_name];
        if (!this.env[target_collection]) {
          console.warn(`Collection class not found or inactive: ${class_name}. Entry ignored.`);
          continue;
        }
        this.env[target_collection].items[entity_key] = new this.env.item_types[class_name](this.env, value);
      }
    }
  }
}