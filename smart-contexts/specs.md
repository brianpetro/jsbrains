## Smart Contexts spec
### adapters
- `compile_adapters`
	- `SmartContexts` getter `compile_adapters` uses `static adapter_key` property from adapter classes in `this.opts.compile_adapters` to cache adapter map at `this._compile_adapters`
	- used to transform `snapshot{}` into final output used as context
	- `smart_context.compile(opts{})`
		- initiates adapter from `smart_context.collection.compile_adapters`
			- uses `template_compile_adapter` by default unless `opts.adapter_key` is set
	- Base `_adapter.js`
		- `static adapter_key = "default"`
		- returns JSON returned by `get_snapshot()`
	- `template_compile_adapter.js`
		- `static adapter_key = "default_template"`
		- implements current logic in `compiler.js`
### data structures
- `context_opts{}`
	- may include `templates[n]` object where properties are -1,0,1,2... mapping to wrap-full, wrap-primary, wrap-secondary, wrap-tertiary... context items
		- values are objects containing `before` and `after` properties with text to insert before/after the respective scope
	- can include all context-related settings (e.g. `link_depth`, `inlinks`, `excluded_headings`, etc.)
- `context_snapshot{}`
	- `.items[0]` primary items
		- similar to `context_items{}` object with values replaced by the content at the source referenced by the property name
	- `.items[1]` secondary items
		- linked items in primary items
	- `.items[2]` tertiary items
#### `item.data{}`
- `context_items{}`
	- References to primary sources (items) stored as `{ [source1.key]: true, ... }`

### settings
- `max_len` property (in characters) to define a limit for final compiled output (larger items may be truncated or skipped to respect this limit)
- `link_depth` for how many levels of outbound/inbound links to traverse
- `templates{}` may contain `{before, after}` objects for wrapping context items at varying depths
	- Properties map to respective items depth
		- `templates[-1]` may be used to wrap the final output of all items
		- `templates[0]` is used to wrap each primary item, `templates[1]` wraps each secondary item, ...
### methods
- `get_snapshot(opts={})`
	- `opts` is a `context_opts{}` object that's merged with `this.collection.settings{}`
	- item references are retrieved from `Object.keys(this.data.context_items{})` and the values are replaced by their source (items) content (`source.read()`)
		- respects excluded headings (omits from returned content)
		- checks against `max_len` and can exclude or truncate content as needed
		- links are traversed up until the `link_depth` setting
		- new object is saved to `context_snapshot.items[0]`
	- returns a `context_snapshot{}` object with references replaced by actual content
- `compile(opts={})`
	- Transforms context snapshot into a compiled string and provides stats
	- Merges collection-level settings and with `opts{}`
		- `opts{}` may be used to override collection-level settings
	- Builds the final context string and statistics
		- wraps context items and final output with their respective templates
	- returns `{ context: string, stats{} }`
- `respect_exclusions(opts={})`
	- Strips out headings or sections matching user-defined `excluded_headings`
	- Mutates `opts.items` and optionally `opts.links`
- `process_items(merged)` and `process_links(merged)`
	- Internal steps used by `get_snapshot()`
	- Gather and load content for the items
	- Traverse and merge link data (outbound or inbound)

# Smart Contexts API Specification

This document describes the primary **SmartContexts** and **SmartContext** classes and their methods, along with relevant utilities. It has been updated to match the current code structure in `smart-contexts`.

## Classes

### `SmartContexts` (Collection)

- Inherits from `Collection` in `smart-collections`.
- Stores multiple `SmartContext` items, each identified by `item.data.key`.
- **Settings**:
    - `link_depth` (number)
    - `inlinks` (boolean) – note that code uses `opts.include_inlinks` for inbound linking logic
    - `excluded_headings[]` (array of strings)
    - `max_len` (number)
    - `templates` (object)
      Maps integer depths (`-1`, `0`, `1`, `2`, …) to a `{ before: '', after: '' }` object.
      - `templates[-1]` wraps the entire compiled output (before everything, after everything).
      - `templates[0]` wraps each depth-0 (primary) item.
      - `templates[1]` wraps each depth-1 (secondary) item, etc.

```js
{
  link_depth: 0,
  inlinks: false,
  excluded_headings: [],
  max_len: 0,
  templates: {
    '-1': { before: '', after: '' },
    '0': { before: '', after: '' },
    '1': { before: '', after: '' },
    // etc.
  }
}
```

### `SmartContext` (CollectionItem)

Represents a single context definition. Holds:

- `data.context_items {}`: references to files/folders for depth=0
- `data.context_opts {}`: local overrides, e.g. `link_depth`, `max_len`, `excluded_headings`, `templates`, etc.

Key methods:

1. **`get_snapshot(opts = {})`**
    
    - Gathers items up to `link_depth`, possibly including inbound links if `inlinks`/`include_inlinks` is set.
    - Returns a `context_snapshot` object with this shape:
        - `items[depth][path] = { ref, path, content, char_count, exclusions, excluded_char_count }`
        - `skipped_items[]`, `truncated_items[]`, `missing_items[]` (though skipping/truncation at snapshot-level is minimal; main truncation may happen in `compile`)
        - `char_count` is set or incremented as applicable
    - Internally calls utilities such as `strip_excluded_headings`.
2. **`compile(opts = {})`**
    
    - Obtains a snapshot by calling `get_snapshot(opts)`.
    - Runs `compile_snapshot(snapshot, merged_opts)`.
    - Returns:
        
        ```js
        {
          context: 'final string',
          stats: {
            char_count,        // final character count after (optional) top-level wrap
            depth_count,       // how many depth layers are present
            truncated_items,   // array of items that were partially truncated
            skipped_items      // array of items skipped (often when template alone exceeded max_len)
          }
        }
        ```
        
    - Enforces `max_len` again at compile-time:
        - If item text + templates exceed `max_len`, item might be skipped.
        - Or partial truncation of item content if the template fits but the content is too large.
        - Finally, tries to wrap the entire output with `templates[-1]`; if that also fits, it is included.

## Utilities

### `get_snapshot(ctx_item, opts)`

Found in `utils/get_snapshot.js`. It:

1. Builds an initial `snapshot = { items: {}, truncated_items: [], skipped_items: [], missing_items: [], char_count: 0 }`.
2. Iterates from depth = 0 to `opts.link_depth`, collecting items:
    - For each key at the current depth, calls `ctx_item.get_ref(key)`.
    - If none found, adds `key` to `missing_items`.
    - Otherwise reads file content, strips excluded headings, and places the result in `snapshot.items[depth][path]`.
    - Codeblock expansions: if that file's content has ```smart-context code blocks, references in them are added at the same depth.
3. If `opts.include_inlinks` is true, merges in inbound links at the next depth.
4. Moves outlinks to the next depth (depth+1).
5. Returns the final snapshot object.

### `compile_snapshot(context_snapshot, merged_opts)`

In `utils/compiler.js`:

1. Sorts depths from lowest to highest.
2. Iterates over each `depth`, building "chunks."  
    For each item:
    
    ```js
    {
      path,
      before_tpl, // e.g. replace_vars( templates[depth].before, placeholders )
      item_text, 
      after_tpl
    }
    ```
    
3. Applies `max_len` checks:
    - If `template_len` alone exceeds `max_len`, skip the item entirely.
    - Else, if text too large, partially truncate it.
    - Else include it fully.
    - Tracks `skipped_items` and `truncated_items`.
4. Joins all chunks. Then tries top-level wrap from `templates[-1]`. If it fits, includes it. Otherwise, it is skipped.
5. Returns:
    
    ```js
    {
      context: final_context_string.trim(),
      stats: {
        char_count,
        depth_count,
        truncated_items,
        skipped_items
      }
    }
    ```
    
    Note that `char_count` is the final length (with a small +2 offset if top-level wrap was included).

### `respect_exclusions(opts)`

In `utils/respect_exclusions.js`, though the code also uses `strip_excluded_headings` directly.  
Removes headings (and subsequent lines) matching patterns in `excluded_headings`.  
Used by `get_snapshot` or as a direct utility.

---

## Typical Flow

1. **`ctxItem.get_snapshot(opts)`**  
    Creates a `context_snapshot`:
    
    ```js
    {
      items: {
        0: { 'file.md': { ref, path, content, ... }, ... },
        1: { 'linked.md': { ... } },
        ...
      },
      missing_items: [...],
      skipped_items: [...],
      truncated_items: [...],
      char_count: 0
    }
    ```
    
2. **`ctxItem.compile(opts)`**  
    Internally calls `get_snapshot(opts)`, then runs `compile_snapshot(...)`. Returns:
    
    ```js
    {
      context: 'final compiled text',
      stats: {
        char_count,
        depth_count,
        skipped_items: [...],
        truncated_items: [...]
      }
    }
    ```
    

# Smart Contexts Data Specification

## `context_item.data.context_items` (Object)

Keys are paths (files/folders) or references, values are booleans (or future usage) indicating inclusion at depth=0.

Example:

```json
{
  "notes/example.md": true,
  "docs/README.md": true,
  "some/folder": true
}
```

## `context_opts` (Object)

Local overrides or user-supplied.  
May include:

- `link_depth` (number)
- `max_len` (number)
- `inlinks` (boolean) or `include_inlinks` in code
- `excluded_headings[]` (array of strings)
- `templates` (object)
    - integer keys => `{ before: '', after: '' }`
    - `-1` => top-level wrap

## `context_snapshot` (Object)

Returned by `get_snapshot()`. Current code shapes it like:

```json
{
  "items": {
    "0": {
      "notes/example.md": {
        "ref": { /* reference object from env, containing outlinks, inlinks, etc. */ },
        "path": "notes/example.md",
        "content": "file content after heading exclusions...",
        "char_count": 123,
        "exclusions": [],            // which patterns got excluded, if any
        "excluded_char_count": 45    // how many chars were removed
      }
    },
    "1": {
      "another.md": { /* similar shape */ }
    }
  },
  "skipped_items": [],
  "truncated_items": [],
  "missing_items": [],
  "char_count": 0
}
```

- **`items[depth]`**: each key is the file/folder path, value is an object with the file’s `content` plus metadata.
- **`missing_items[]`**: references that could not be found in `ctx_item.get_ref(key)`.
- **`skipped_items[]`**: rarely populated at snapshot-phase in the current code (more in compile-phase).
- **`truncated_items[]`**: same note; the compiler does the main truncation.
- **`char_count`**: a numeric tally that may be incremented.

## Final compiled result

From `compile(context_snapshot, opts)` =>

```json
{
  "context": "final compiled string",
  "stats": {
    "char_count": 321,             // length after possible wrap
    "depth_count": 2,              // how many depth layers were processed
    "truncated_items": ["bigFile.md"],
    "skipped_items": ["hugeFile.md"]
  }
}
```
