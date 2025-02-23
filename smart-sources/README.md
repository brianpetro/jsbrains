# Smart Sources

Smart Sources is a system for managing and parsing external content, typically stored in files or other data sources. Each content source is represented by a `SmartSource` entity, and these are collectively managed by a `SmartSources` collection. Internally, Smart Sources delegates reading, parsing, and writing to specialized adapters. You can define your own adapters for new file types or even external APIs.

Below is an outline of core classes, primary methods, and how to configure and use them.

## Overview

- **SmartSource**  
  Represents an individual piece of external content. Handles:
  - Reading, parsing, and importing the content (via `import()`)
  - Parsing blocks and links (via `parse_content(content)`)
  - Performing CRUD-like operations (read, update, remove, merge, move, etc.)
  - Integrating with a 'block collection' to extract meaningful subsections (blocks)

- **SmartSources**  
  The collection class managing multiple `SmartSource` items. Main tasks:
  - Initializing items with `init_items()` (often scanning the file system by default)
  - Building a link map across sources
  - Loading and saving source data (via the configured data adapter)
  - Enabling search, pruning of outdated items, re-importing, etc.

- **SourceContentAdapter**  
  Base class for reading/writing source data. Extend it for file-based or API-based adapters.  
  Example built-ins:
  - `FileSourceContentAdapter` (parent for Markdown, Text, etc.)
  - `MarkdownSourceContentAdapter`
  - `ObsidianMarkdownSourceContentAdapter`
  - `TextSourceContentAdapter`
  - `AjsonMultiFileSourceDataAdapter` (for storing item data in `.ajson` files)

## Usage at a Glance

1. **Environment and Collection Setup**  
   Configure `env.opts.collections.smart_sources` with the required adapters:
   ```
   env.opts.collections.smart_sources = {
     source_adapters: {
       default: MarkdownSourceContentAdapter,
       md: MarkdownSourceContentAdapter,
       txt: TextSourceContentAdapter,
       // additional custom types...
     },
     content_parsers: [
       // optional array of parser functions called after parsing blocks
       // e.g. parseTemplates, parseMermaid, etc.
     ]
   };
   ```
   Then create or retrieve your `SmartSources` collection instance.  
   ```
   const sources = env.smart_sources; // or new SmartSources(env, { ... })
   ```

2. **Initialization**  
   When you call:
   ```
   await sources.init_items();
   ```
   it discovers all potential items (files, or otherwise) and initializes them as `SmartSource` objects. File-based sources typically rely on the file system extension to pick an adapter. If no matching adapter is found, it falls back to `default`.

3. **Importing**  
   Each `SmartSource` can be imported via:
   ```
   await source.import();
   ```
   The adapter reads raw data (e.g. from disk), then the source calls:
   - `source.parse_content(content)` internally
   - Inside `parse_content`, the system can optionally parse blocks (`parse_blocks`), parse links (`parse_links`), and call any custom parser functions defined in `env.opts.collections.smart_sources.content_parsers`.

4. **Reading & Writing**  
   - **Read**:  
     ```
     const content = await source.read();
     ```
   - **Update** (writes the entire content):
     ```
     await source.update(newContent);
     ```
   - **Append** (adds lines at the end):
     ```
     await source.append('Extra lines');
     ```
   - **Remove** (deletes from file system and removes from the collection):
     ```
     await source.remove();
     ```
     or
     ```
     source.delete(); // removes from the collection data but doesn't always remove the file
     ```

5. **Blocks**  
   If the block collection is enabled (`env.smart_blocks`), `SmartSource` uses block-level parsing to identify sub-parts of each file. This helps with searching, partial merges, or line-based updates.  
   For example, `parse_content(content)` may create references in `source.data.blocks` to each block range. You can then read or update individual blocks:
   ```
   const aBlock = env.smart_blocks.get('my_source.md#Heading 1');
   await aBlock.append('some text');
   ```

6. **Custom Content Parsers**  
   To add specialized parsing after basic block/heading extraction, define custom parser functions in `env.opts.collections.smart_sources.content_parsers`. For example:
   ```
   env.opts.collections.smart_sources.content_parsers.push(
     async function parseTemplates(source, content) {
       // analyze 'content' and update source.data accordingly
       // e.g. source.data.templates = ...
     }
   );
   ```
   When `source.parse_content(content)` runs, it calls each function in the array, passing `(source, content)`.

7. **init_items and Adapters**  
   - `init_items()` is called in `SmartSources` to scan for relevant items (e.g. by file extension) and create or update `SmartSource` instances.  
   - For file-based sources, the `FileSourceContentAdapter` (or its subclasses) helps detect changed files and triggers re-import.  
   - You can override or define custom logic to handle items that are not stored on disk. (For external APIs, just implement a new adapter and list it in `source_adapters`.)

8. **Replacing Old 'source_adapter_key' Checks**  
   Previously, the system relied on matching `source_adapter_key` for file types. Now, that logic is replaced by scanning `source_adapters` (e.g. `'md': MarkdownSourceContentAdapter`). If you need more dynamic detection:
   - Build a custom map in `init_items` or
   - Override `get source_adapter()` in `SmartSource` to detect type from the path or a custom property.

9. **Example snippet**  
   ```
   import { SmartSources } from 'smart-sources/smart_sources.js';

   // Suppose env is your environment object
   const sources = new SmartSources(env);
   await sources.init_items();

   // Create a new source
   const newSource = await sources.create('notes/new_note.md', '# Title\nSome content');
   await newSource.import(); // parse blocks, update data

   // Read or update it
   console.log(await newSource.read());
   await newSource.update('# Title\nUpdated content!');
   ```

## parse_content Flow

`SmartSource.parse_content(content)`:
- Optionally calls any block-level parse methods (ex: `block_collection.import_source(this, content)`)
- Checks or creates `source.data.blocks`
- Runs each function in `env.opts.collections.smart_sources.content_parsers`
- Stores results in `source.data`, for example `source.data.templates`, `source.data.metadata`, etc.

You can customize `parse_content` or the block parser to:
- Identify frontmatter
- Extract special tags or references
- Build domain-specific structures like 'templates' or 'mermaid diagrams'
- Post-process content with LLM-based analysis

## Notes on init_items

- `init_items()` in `SmartSources` sets up the environment and typically calls `fs.init()` to load a file listing.
- It finds matching adapters by file extension (or uses the `'default'` adapter) to create `SmartSource` instances.
- Subclassing or overriding can let you dynamically fetch remote sources or handle custom naming (like `repo_issue_213.github`).

Example override:
```
class CustomRemoteSources extends SmartSources {
  async init_items() {
    await someApiFetch();
    // create items in memory only
    this.items['remote_source_1'] = new this.item_type(this.env, { path: 'remote_source_1' });
    // ...
  }
}
```

## Additional References

- **`smart_source.js`**  
  Core methods such as `import()`, `parse_content()`, `read()`, `update()`, `merge(content, {mode})`, `remove()`, `move_to()`, etc.
- **`smart_sources.js`**  
  Contains `init_items()`, `prune()`, `search()`, `lookup()`, `build_links_map()`, and general collection logic.
- **Adapters**  
  - `AjsonMultiFileSourcesDataAdapter`: Writes each source's data and blocks to `.ajson` files.
  - `MarkdownSourceContentAdapter`: Specialized for `.md` file reading/writing, handles frontmatter detection, calls `parse_content`.
  - `ObsidianMarkdownSourceContentAdapter`: Extends the markdown adapter to work with Obsidian's metadata cache.
  - `DataContentAdapter`: Minimal in-memory approach for `item.data.content`.

These adapters show how you can customize read/write logic or handle specialized formats. By combining them with your own `env.opts.collections.smart_sources.content_parsers`, you can parse nearly any text-based content into structured data or blocks.