---
sync external: ../jsbrains/smart-contexts/specs.md
---
## Purpose
`SmartContexts` manage one or more `SmartContext` items, each representing a named or persistent context that references files, blocks, or other relevant sources. The result is a compiled 'context' string (plus metadata) that can be used for further processing, such as AI prompts or user workflows.

By design, `SmartContexts` extends `Collection` from **smart-collections**, while `SmartContext` extends `CollectionItem`. This ensures `SmartContexts` benefit from built-in creation, update, and storage capabilities.

## Data Structures

### SmartContexts Collection

- **Role** Manages multiple SmartContext items. Each SmartContext describes references and rules to build a text-based context.
- **Storage** Inherits from Collection, storing each SmartContext item keyed by item.data.key (if present) or auto-hashed.
- **Settings** (in `this.settings`): Defines default behaviors for all `SmartContext` items within this collection:
	- `link_depth` (number, default=0): How many link-hops to follow from each 'depth' of items.
	- `inlinks` (boolean, default=false)  
		If true, includes inbound links.
	- `excluded_headings[]` (Array of string patterns)  
		Headings or patterns to skip in the final context.
	- `max_len` (number, optional): If set, a maximum character limit for the compiled output.
		- Precedence: Primary, secondary, tertiary items added in full before including any in subsequent scope
		- Includes shortest items first
		- May truncate last item to fit
		- May list names of items that exceeded limit
	- `templates` (object, optional): Maps depth indices (-1, 0, 1, 2, ...) to an object `{ before: '', after: '' }`.  
		- `templates[-1]` wraps the entire output (before all items, after all items).  
		- `templates[0]` wraps each depth-0 (primary) item.  
		- `templates[1]` wraps each depth-1 (secondary) item, and so on.  
		- Additional or custom depth levels can be added as needed.  

```js
{
  link_depth: 0,
  inlinks: false,
  excluded_headings: [],
  max_len: 10000, // example
  templates: {
    '-1': { before: 'All-Start\n', after: '\nAll-End' },
    '0': { before: '[primary:', after: ':primary]' },
    '1': { before: '[secondary:', after: ':secondary]' },
    // etc.
  }
}
```

### SmartContext Item

Each `SmartContext` defines a single context “bundle” and how to compile it.

- **Key Fields** (in `item.data`):
  - `key`  
    Unique identifier for the context (user-defined or auto-generated).
  - `context_items{}`  
    Dictionary of sources to include at depth=0. For example:  
    ```js
    {
      'notes/example.md': true,
      'docs/README.md': true
    }
    ```
  - (Optional) `context_opts{}`  
    Local overrides for `link_depth`, `excluded_headings`, `templates`, etc. These override the collection-level defaults if set.

### context_opts{}
Used by either a single item or function calls like `get_snapshot(opts={})` and `compile(context_snapshot, opts={})`.  
Holds any context-related setting or override:
- `max_len`, `link_depth`, `inlinks`, `excluded_headings`
- `templates{}` with integer keys for item-depth or -1 for the entire context (e.g. `{ '-1': {before, after}, '0': {before, after}, ... }`)

### context_snapshot{}
A staged object returned by `get_snapshot()` that organizes resolved items (and possibly links) by depth:
```js
{
  items: {
    0: { 'notes/example.md': 'Content from file...', ... },
    1: { 'docs/README.md': 'Secondary content...', ... },
    2: { ... }
  },
  // additional metadata like skipped or truncated items
}
```

## Methods

### get_snapshot(opts={})
Returns a `context_snapshot{}` after:
1. Merging `opts` with the item’s `data.context_opts` and then with the collection’s default `this.settings`.
2. Resolving `this.data.context_items{}` at depth=0 (possibly also folders).
3. Following links up to `link_depth` for subsequent depths (1..n).
4. Respecting `excluded_headings` (may omit or prune content).
5. Tracking or skipping items if `max_len` is near or exceeded (if partial loading is needed).

### compile(context_snapshot={}, opts={})
Produces a final string and stats object (`{ context, stats }`):
6. Merges `opts` with previously stored context options.
7. Applies any final exclusions or truncations if `max_len` is set.
8. Wraps each depth’s items with `templates[d]` (`before` and `after`) if present.
9. Uses `templates[-1]` to wrap the entire output (before everything, after everything).
10. Returns an object with `context` (the final string) and `stats{...}` (e.g., character counts, list of skipped items).

### respect_exclusions(opts={})
Given an `opts.items` object keyed by path => content, strips headings or sections matching patterns in `excluded_headings`.  
Can also modify `opts.links` in place if needed.

### process_items(merged), process_links(merged)
Internal steps used to load depth=0 items and discover deeper-linked items:
- **process_items(merged)**  
  Iterates over `this.data.context_items{}`, loads or reads each item’s content, stores in `merged.items[0]`.  
- **process_links(merged)**  
  Follows outlinks and/or inlinks up to `link_depth`, populating `merged.items[1]`, `[2]`, etc.

## Depth-Based Handling

- **Depth 0**: Items explicitly referenced in `context_items{}`.  
- **Depth i+1**: Items discovered by following links from depth i.  
- If `max_len` is set, higher-depth items might be skipped if the limit is reached.  
- For items within the same depth, an implementation may prefer adding smaller items first, or applying partial truncation on the final included item.

## Example Flow

```
SmartContext -> get_snapshot(context_opts?)
  (1) merges settings => merged
  (2) process_items(merged) => loads depth=0 items
  (3) process_links(merged) => depth=1..n
  (4) returns context_snapshot

context_snapshot -> compile(context_snapshot, context_opts?)
  (1) merges settings => merged
  (2) optionally re-check max_len or exclusions
  (3) applies templates for each depth
  (4) wraps entire output if templates[-1] present
  (5) returns { context, stats }
```

## Folder References
A 'context item' key may point to a folder instead of a file. In that scenario:
- Depth=0 load might discover all files in that folder (or a subset if partial).
- Those files can be included as though individually listed in `context_items{}`.

## max_len Behavior
When `max_len` is set, content assembly must not exceed this limit:
- Start with depth=0 items. Possibly sort them by size or follow their original order.  
- Add depth=1 items next, continuing until near or at the character limit.  
- Stop or partially truncate the last item if needed.  
- Optionally record which items were skipped in the returned `stats` object.
