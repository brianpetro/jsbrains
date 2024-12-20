# Smart Sources

Smart Sources is a powerful library for managing collections of local or remote sources with ease. It provides a flexible and efficient way to handle various types of content, including markdown files, directories, and more.

## Installation

To install Smart Sources, use npm:

```bash
npm install smart-sources
```

## Usage

Here's a basic example of how to use Smart Sources:

```js
import { SmartSources } from 'smart-sources';

// Create a new SmartSources collection
const sources = new SmartSources();

// Import files into the collection
await sources.import(['path/to/file1.md', 'path/to/file2.md']);

// Create a new SmartSource
const newSource = await sources.create_or_update({ path: 'new-file.md', content: 'Content for the new file' });

// Search the collection
const searchResults = await sources.search({ query: 'example' });
```

## SmartSources

The `SmartSources` class extends `SmartEntities` and represents a collection of `SmartSource` items.

### Methods

- `init()`: Initializes the SmartSources collection.
- `init_items()`: Initializes SmartSources with data.path values from smart_fs.
- `import_file(file)`: Imports a file into the collection.
- `search(search_filter)`: Searches the collection based on provided options.
- `create(key, content)`: Creates a new SmartSource in the collection.
- `prune()`: Removes old data files and updates the collection.
- `refresh()`: Refreshes the collection by pruning and reimporting.

## SmartSource

The `SmartSource` class extends `SmartEntity` and represents an individual source item in the collection.

### Properties

- `key`: Unique identifier for the SmartSource.
- `adapter`: The adapter used by the SmartSource.
- `data`: Data associated with the SmartSource, including file statistics and blocks.

### Methods

- `import()`: Imports and parses the content of the SmartSource.
- `search(search_filter)`: Searches within the SmartSource.
- `read(opts)`: Reads the content of the SmartSource.
- `update(full_content, opts)`: Updates the content of the SmartSource.
- `append(content)`: Appends content to the end of the source file.
- `remove()`: Removes the SmartSource.
- `move_to(entity_ref)`: Moves the SmartSource to a new location.
- `merge(content, opts)`: Merges the given content into the current source.

## SmartBlocks

The `SmartBlocks` class extends `SmartEntities` and represents a collection of `SmartBlock` items.

### Methods

Similar to `SmartSources`, but operates on block-level items.

## SmartBlock

The `SmartBlock` class extends `SmartEntity` and represents an individual block within a SmartSource.

### Properties

- `key`: Unique identifier for the SmartBlock.
- `source`: The parent SmartSource of this block.
- `data`: Data associated with the SmartBlock, including line numbers and content hash.

### Methods

- `read(opts)`: Reads the content of the SmartBlock.
- `update(new_block_content, opts)`: Updates the content of the SmartBlock.
- `append(append_content)`: Appends content to the SmartBlock.
- `remove()`: Removes the SmartBlock.
- `move_to(to_key)`: Moves the SmartBlock to a new location.

## Adapters

Smart Sources uses adapters to handle different types of content. The main adapters are:

- `SourceContentAdapter`: Base adapter class for handling source operations.
- `MarkdownSourceContentAdapter`: Specializes in handling Markdown files.
- `PDFSourceContentAdapter`: Handles PDF files, extracting content into well-formed markdown.

Adapters provide a consistent interface for various operations on different content types.

## Features

- Supports multiple file types including Markdown, PDF, and more.
- Efficient block-level parsing and management.
- Flexible search capabilities across sources and blocks.
- Customizable embedding and retrieval options.
- Integration with Smart Entities for advanced functionality.

## Configuration

Smart Sources can be configured through the `smart_env_config` object, allowing customization of adapters, embedding models, and other settings.

## PDF Handling

The PDF adapter provides special functionality:

- Extracts PDF content into well-formed markdown.
- Includes page numbers in headings for easy reference.
- Stores extracted text in `data.content` for efficient access.
- Configurable extraction model and prompt settings.