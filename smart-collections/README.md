# Smart Collections
Smart Collections is a JavaScript library that provides a convenient interface for managing collections of items.

```bash
npm install smart-collections
```

## usage

```javascript
const { Collection, CollectionItem } = require('smart-collections');
class MyCollection extends Collection { ... };
class MyCollectionItem extends CollectionItem { ... };
```

### Collections

- `Collection` is a base collection class that provides functionality for managing a collection of items.
- It includes methods for creating, updating, reading, and deleting items within the collection.
- The class also supports saving and loading the collection data from disk. 
- Additionally, it provides convenience methods for accessing information about the collection and its items.
- Represents a collection of items.
- Methods: create, update, read, delete.
- Supports saving/loading data from disk.
- Convenience methods for collection information.
- Filtering items in the collection.

### Collection Items

- `CollectionItem` is a class that represents an individual item within a collection.
- It encapsulates the data and behavior associated with an item.
- The class includes methods for updating and saving the item's data, as well as initializing and parsing the item.
- These classes are part of a JavaScript library or application that utilizes collections of items and provides a convenient interface for managing and manipulating them.
- Represents an item within a collection.
- Encapsulates data and behavior of an item.
- Methods: update, save, initialize, parse.

### Filtering

Both `Collection` and `CollectionItem` classes support advanced filtering options through the `filter_opts` parameter. This allows for flexible and powerful querying of items within a collection.

Each `CollectionItem` has a `filter` method that takes a `filter_opts` object and returns a boolean indicating whether the item matches the filter criteria.

#### Available Filter Options:

- `exclude_key`: Excludes a single key.
- `exclude_keys`: An array of keys to exclude. If `exclude_key` is provided, it's added to this array.
- `exclude_key_starts_with`: Excludes keys starting with a specific string.
- `exclude_key_starts_with_any`: Excludes keys starting with any of the provided strings.
- `exclude_key_includes`: Excludes keys that include a specific string.
- `key_ends_with`: Includes only keys ending with a specific string.
- `key_starts_with`: Includes only keys starting with a specific string.
- `key_starts_with_any`: Includes only keys starting with any of the provided strings.
- `key_includes`: Includes only keys that include a specific string.

#### Usage Example:
```javascript
const collection = new MyCollection();
// list is alias for filter
const filtered_items = collection.list({ key_starts_with: 'prefix' });
```

### Components and Rendering

Smart Collections includes a components/ directory that provides a rendering pattern for collection items and settings. This pattern allows for flexible and customizable rendering of collection data.

#### Settings Component

The `settings.js` file in the components/ directory defines a render function for collection settings:

```javascript
export async function render(scope, opts = {}) {
  // Render logic for settings
}

export async function post_process(scope, frag, opts = {}) {
  // Post-processing logic for rendered settings
}
```

This component is used to render settings for a collection, allowing for easy customization of the settings interface.

#### Item Component

While not explicitly defined in the provided files, the component pattern can be extended to individual collection items. You can create a custom render function for your collection items:

```javascript
async function render_item(item, opts = {}) {
  // Custom rendering logic for an individual item
}
```

#### Usage

To use these components, you can call them from your collection or item classes:

```javascript
class MyCollection extends Collection {
  async render_settings(container, opts = {}) {
    const frag = await this.render_settings_component(this, opts);
    container.appendChild(frag);
  }
}

class MyCollectionItem extends CollectionItem {
  async render(container, opts = {}) {
    const frag = await this.component.call(this.smart_view, this, opts);
    container.appendChild(frag);
  }
}
```

This component-based rendering pattern allows for a clean separation of concerns between data management and presentation, making it easier to customize the display of your collection data.

## about
Smart Collections was built for the [Smart Connections](https://smartconnections.app) Obsidian plugin and [Smart Predictions Framework](https://wfhbrian.com/).
