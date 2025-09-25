/**
 * Converts a class name to its corresponding collection instance name.
 * 
 * This function performs the following transformations:
 * 1. Converts camelCase to snake_case
 * 2. Makes the name plural (with special handling for words ending in 'y')
 * 3. Handles the special case of names ending with 'Item'
 * 
 * @param {string} class_name - The class name to convert (e.g., 'SmartEntity', 'CollectionItem')
 * @returns {string} The converted collection instance name (e.g., 'smart_entities', 'collection')
 * 
 * @example
 * collection_instance_name_from('SmartEntity') // Returns 'smart_entities'
 * collection_instance_name_from('CollectionItem') // Returns 'collection'
 */

export function collection_instance_name_from(class_name) {
  // Handle special case for 'CollectionItem'
  if (class_name.endsWith('Item')) {
    return class_name
      .replace(/Item$/, '')
      .replace(/([a-z])([A-Z])/g, '$1_$2') // convert camelCase to snake_case
      .toLowerCase() // convert to lowercase
    ;
  }

  return class_name
    .replace(/([a-z])([A-Z])/g, '$1_$2') // convert camelCase to snake_case
    .toLowerCase() // convert to lowercase
    .replace(/y$/, 'ie') // handle 'y' ending (e.g., Entity -> Entities)
    + 's'; // add 's' for plural
}
