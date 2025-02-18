# Smart Contexts Data Specification

## `context_item.data.context_items` (Object)
Keys are file/folder paths or block IDs, values are boolean or additional flags. If `true`, it means 'include this path at depth=0'.

Example:
```json
{
  "notes/example.md": true,
  "docs/README.md": true,
  "some/folder": true
}
```

## `context_opts` (Object)
Local overrides for each SmartContext item:
- `link_depth` (number)
- `inlinks` (boolean)
- `max_len` (number)
- `excluded_headings[]` (array of strings)
- `templates` (object) integer depth => {before, after}, plus `-1` for full wrap

## `context_snapshot` (Object)
Produced by `get_snapshot`. Example:
```json
{
  "items": {
    "0": {
      "notes/example.md": "file content here ...",
      "folder/sub.md": "sub content"
    },
    "1": {
      "docs/README.md": "some link-based content"
    }
  },
  "truncated_items": ["folder/bigFile.md"],
  "skipped_items": ["someHugeFile.md"],
  "total_char_count": 1234
}
```

## Final compiled result
From `compile(context_snapshot, opts) => { context, stats }`

- `context`: The final concatenated string after all template insertions, re-checking max_len.
- `stats`:
  - `final_length` - number
  - `depth_count` - number
  - `truncated_items` - array of strings
  - `skipped_items` - array of strings
```