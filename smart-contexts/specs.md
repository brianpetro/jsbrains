---
sync external: ../jsbrains/smart-contexts/specs.md
---
## Purpose
`SmartContexts` manages one or more `SmartContext` items. Each `SmartContext` references files, blocks, folders, or other sources to build a text-based “context.” This compiled context (plus metadata) can be used for AI prompts, user workflows, or other processing.
`SmartContexts` extends `Collection` from **smart-collections**, and `SmartContext` extends `CollectionItem`. This ensures built-in creation, update, and storage capabilities.

## Data Structures
### `SmartContexts` Collection
**Role**
Manages multiple `SmartContext` items. Each item organizes references (files, blocks, folders, etc.) plus local compile rules.
**Storage**
Inherits from `Collection`. Stores each `SmartContext` keyed by `item.data.key` (if present) or auto-generated.
**Settings** (in `this.settings`)
Default behaviors for all `SmartContext` items:
- `link_depth` (number, default=0)
	How many link-hops to follow from each depth of items.
- `inlinks` (boolean, default=false)
	If true, includes inbound links.
- `excluded_headings[]` (array of string patterns)
	Headings or patterns to skip in final context.
- `max_len` (number, optional)
	Character limit for compiled output:
	- The code should handle skipping or truncating items to respect this limit.
	- In practice, this includes two phases:
		1. **Snapshot phase**: building or skipping items up to `max_len`.
		2. **Compile phase**: re-check or re-truncate if needed.
	- Priority is to include **primary** items first (depth=0), then secondary (depth=1), etc.
	- Possibly includes “shortest items first” if partial constraints apply.
- `templates` (object)
	Maps integer depths (`-1`, `0`, `1`, `2`, …) to a `{ before: '', after: '' }` object.
	- `templates[-1]` wraps the entire compiled output (before everything, after everything).
	- `templates[0]` wraps each depth-0 (primary) item.
	- `templates[1]` wraps each depth-1 (secondary) item, etc.
Example:
```js
{
  link_depth: 0,
  inlinks: false,
  excluded_headings: [],
	max_len: 10000,
  templates: {
    '-1': { before: 'All-Start\n', after: '\nAll-End' },
		'0': { before: '[PRIMARY:', after: ':END_PRIMARY]' },
		'1': { before: '[SECONDARY:', after: ':END_SECONDARY]' }
  }
}
```
### `SmartContext` Item
Represents one context bundle (with local settings and references).
- **Key Fields** (`item.data`):
	- `key`: Unique context identifier (if none, auto-hashed).
	- `context_items{}`:
	Primary references (files, blocks, or folders) at depth=0. Example:
	```js
	{
		'notes/example.md': true,
		'docs/README.md': true
	}
	```
	- `context_opts{}` (optional):
	Local overrides for `link_depth`, `excluded_headings`, `templates`, `max_len`, etc. These override collection-level defaults if set.
### `context_opts{}`
Used by a single item or passed to `get_snapshot(opts={})` or `compile(context_snapshot, opts={})`.
Can include:
- `max_len`
- `link_depth`
- `inlinks`
- `excluded_headings`
- `templates`
	Has integer keys for item-depth and a `-1` key for wrapping the entire output:
	```js
	{
	'-1': { before: '...', after: '...' },
	'0': { before: '...', after: '...' },
	'1': { before: '...', after: '...' }
	}
	```
### `context_snapshot{}`
A staged object from `get_snapshot()`. Organizes resolved items (and possibly links) by depth:
```js
{
  items: {
    0: { 'notes/example.md': 'Content from file...', ... },
    1: { 'docs/README.md': 'Secondary content...', ... },
    2: { ... }
  },
	truncated_items: [], // e.g. [ 'notes/very_large.md' ]
	skipped_items: [],   // e.g. [ 'anotherHugeFile.md' ]
	total_char_count: 12345
	// additional metadata
}
```

## Methods
### `get_snapshot(opts={})`
Builds a `context_snapshot{}` by:
1. Merging `opts` with the item’s `data.context_opts` and then with the collection’s `this.settings`.
2. Resolving `this.data.context_items{}` at depth=0 (expanding folders if needed).
3. Following links up to `link_depth` (depth=1..n), possibly including inbound links if `inlinks=true`.
4. Respecting `excluded_headings` to omit matching headings/sections.
5. Checking `max_len`. If set:
   - Use a depth-based approach (include depth=0 first, then depth=1, etc.).
   - If required, skip or partially truncate items to obey the limit.
   - Potentially prioritize **shortest items first** within a given depth if that is configured (some implementations might rely on the original order or do a size-based sort).
6. Returns a `context_snapshot{ items: {0: {...}, 1: {...}}, truncated_items:[], skipped_items:[], ... }`.
### `compile(context_snapshot={}, opts={})`
Given a `context_snapshot` and optional overrides:
1. Merges `opts` with the existing context options and defaults.
2. Optionally re-checks `max_len` (secondary check) to ensure final output remains within the limit.
   - Could skip or truncate further if needed.
3. Applies templates for each depth `templates[d].before/after`.
4. Wraps entire output with `templates[-1]` if present.
5. Returns an object:
   ```js
   {
     context: 'final string here',
     stats: { final_length, depth_count, truncated_items, skipped_items }
   }
   ```
### `respect_exclusions(opts={})`
Removes heading/section content matching patterns in `excluded_headings`.
Operates on `opts.items`, possibly on `opts.links` if applicable.
### `process_items(merged)`, `process_links(merged)`
Internal methods used by `get_snapshot()`:
- `process_items(merged)`:
  Loads or reads depth=0 items from `context_items{}`. May also expand folders into individual files if that is enabled.
- `process_links(merged)`:
  Follows outlinks (and inlinks if `inlinks=true`) up to `link_depth`, storing them at `depth=1`, `depth=2`, etc.

## Depth-Based Handling
- **Depth 0**: Items explicitly in `context_items{}`.
- **Depth i+1**: Items discovered from links at the previous depth.
- If `max_len` is set, we skip or truncate items if adding them would exceed the limit.
- Optionally apply size-based sorting at each depth.

## Example Flow

```
SmartContext -> get_snapshot(context_opts)
  (1) merges settings => merged
  (2) process_items -> loads depth=0
  (3) process_links -> depth=1..N
  (4) returns context_snapshot
context_snapshot -> compile(context_snapshot, context_opts)
  (1) merges settings => merged
  (2) re-checks max_len if needed (may skip or truncate more)
  (3) applies templates per depth
  (4) wraps entire output with templates[-1]
  (5) returns { context, stats }
```

## Folder References
If a `context_items` key points to a folder:
- On depth=0, that folder can be expanded into all contained files (or a subset if partial).
- Treated as though those files were individually listed in `context_items{}`.

## `max_len` Behavior
- Phase 1 (Snapshot):
  - Start from depth=0, adding items (possibly smallest first) until near or at the limit.
  - Then proceed with depth=1, etc.
  - Possibly skip or partially truncate items.
  - Record any truncated/skipped in the snapshot metadata.
- Phase 2 (Compile):
  - Another check ensures final text stays within `max_len`. If needed, the last chunk might be truncated or a deep item might be dropped.
  - This “double-check” can help if templates or additional text push the total over the limit.