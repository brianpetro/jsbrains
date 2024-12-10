```README.md```
# Smart Collections

Smart Collections is a JavaScript library that provides a convenient and flexible interface for managing collections of items. It aims to support a variety of data sources, storage mechanisms, and query options.

```bash
npm install smart-collections
```

## Overview

Smart Collections consists of two primary classes: `Collection` and `CollectionItem`. These classes provide the foundation for creating, managing, and persisting items in various storage backends (e.g., single-file JSON, multi-file AJSON, or SQLite databases).

### Features

- **CRUD Operations**: Easily create, read, update, and delete items.
- **Multiple Storage Adapters**: Choose from JSON (single-file), AJSON (multi-file append-only), or SQLite storage adapters.
- **Filtering and Querying**: Use advanced filter options to refine query results.
- **Batch and Queue Processing**: Load and save operations can be batched and queued to improve performance and reduce I/O overhead.
- **Lazy Loading**: Defer loading item data until it is needed.
- **Extensible Rendering**: Includes a component-based rendering pattern for settings and items, suitable for integrating with UI frameworks or custom logic.

## Usage

```javascript
const { Collection, CollectionItem } = require('smart-collections');

class MyCollection extends Collection {
  // Optionally override or extend behaviors
}

class MyCollectionItem extends CollectionItem {
  // Optionally override or extend behaviors
}
```

### Collections

A `Collection` is responsible for managing a set of items. It:

- Stores items keyed by a unique identifier.
- Provides `create`, `read`, `update`, and `delete` operations.
- Supports saving and loading data using a data adapter.
- Offers filtering capabilities through a unified `filter_opts` parameter.
- Uses queue and batch methods for loading/saving multiple items efficiently.
- Can be configured to lazy-load items, preventing loading until explicitly requested.

### Collection Items

A `CollectionItem` encapsulates the data and behavior of a single entity within a collection. It:

- Holds item-level data in `this.data`.
- Implements `update`, `save`, `load`, `validate_save`, and `delete` methods.
- Uses `_queue_load` and `_queue_save` for deferred operations.
- Provides flexible filtering through `filter_opts`.
- Integrates with a collection’s data adapter to handle persistence.

### Filtering Options

Both `Collection` and `CollectionItem` support advanced filtering through a `filter_opts` object. These filters allow powerful and flexible queries on keys:

- `exclude_key`: Exclude a single key.
- `exclude_keys`: Exclude multiple keys.
- `exclude_key_starts_with`: Exclude keys starting with a given prefix.
- `exclude_key_starts_with_any`: Exclude keys starting with any string in a given array.
- `exclude_key_includes`: Exclude keys that include a given substring.
- `key_ends_with`: Include only keys ending with a given substring.
- `key_starts_with`: Include only keys starting with a given substring.
- `key_starts_with_any`: Include only keys starting with any prefix in a given array.
- `key_includes`: Include only keys that include a given substring.

**Example:**
```javascript
const collection = new MyCollection();
const filtered_items = collection.list({ key_starts_with: 'prefix' });
```

### Data Adapters

Smart Collections supports multiple data storage strategies via adapters:

- **AJSON Multi-File**: Append-only JSON lines per file, suitable for large datasets and incremental updates.
- **JSON Single-File (WIP)**: Simple all-in-one JSON storage, convenient for testing or small collections.
- **SQLite (WIP)**: SQLite-based storage for more robust and queryable persistence.

Adapting the collection to a storage backend requires specifying a data adapter in the environment configuration.

### Batch and Queue Processing

- **Batch Processing**: `Collection` classes can implement `process_save_queue()` and `process_load_queue()` methods to handle all queued saves or loads at once.
- **Queueing**: Items can set `_queue_load` or `_queue_save` to `true` to defer these operations until a batch run, improving performance.

### Lazy Loading

When `prevent_load_on_init` is enabled or certain lazy-loading strategies are used, items can defer their load operations until explicitly needed. This reduces initial load times, especially for large datasets.

```javascript
await collection.run_load(); // processes all queued loads
```

### Component-Based Rendering

A component-based rendering pattern allows for separation of data logic from presentation. For example:

- `components/settings.js` provides a `render` and `post_process` function to display collection settings.
- Extend this pattern by implementing custom `render_item` functions for `CollectionItem` subclasses.

```javascript
class MyCollection extends Collection {
  async render_settings(container, opts = {}) {
    const frag = await this.render_collection_settings(container, opts);
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

By default, these rendering methods use a component pattern that can be replaced or overridden with custom logic as needed.

## About

Smart Collections was built for the [Smart Connections](https://smartconnections.app) Obsidian plugin. It provides a versatile and extensible foundation for managing data in JavaScript applications.
