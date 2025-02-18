# Smart Contexts API Specification

This document describes the primary **SmartContexts** and **SmartContext** classes and their methods, along with relevant utilities.

## Classes

### `SmartContexts` (Collection)
- Inherits from `Collection` in `smart-collections`.
- Stores multiple `SmartContext` items, each identified by `item.data.key`.
- **Settings**:
  - `link_depth` - number
  - `inlinks` - boolean
  - `excluded_headings[]` - array of strings
  - `max_len` - number
  - `templates` - object, integer keys => { before, after }, plus `-1` for final wrap

### `SmartContext` (CollectionItem)
- Fields:
  - `data.context_items{}`: references to files/folders/blocks for depth=0
  - `data.context_opts{}`: local overrides (max_len, link_depth, etc.)
- Methods:
  1. **`get_snapshot(opts={})`**  
     Returns a `context_snapshot` object with `.items[depth]`, plus `skipped_items[]`, `truncated_items[]`, `total_char_count`.
  2. **`compile(context_snapshot, opts={})`**  
     Returns final object `{ context: string, stats: { final_length, truncated_items, skipped_items } }`, applying templates and re-checking `max_len`.

## Utilities

### `build_snapshot(ctx_item, opts)`
Called inside `SmartContext.get_snapshot`.
- Gathers items + expansions at depth=0..link_depth.
- Respects `excluded_headings`.
- Respects `max_len` by skipping or partially truncating largest items first.

### `compile_snapshot(context_snapshot, merged_opts)`
Called inside `SmartContext.compile`.
- Applies per-depth templates from `merged_opts.templates[depth]`.
- Wraps the entire output with `templates[-1]` if present.
- Re-checks `max_len`. Possibly skip or partially truncate again.
- Returns final `context` string plus stats.

## Example Flow

1. `scItem.get_snapshot({ link_depth: 1 })` => obtains snapshot
2. `scItem.compile(snapshot, { templates: ... })` => final string
