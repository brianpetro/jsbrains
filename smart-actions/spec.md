### Smart Actions v1
Smart Actions orchestrates executable modules across inline packages, local files, and remote connectors. The base implementation lives in `jsbrains/smart-actions` and Smart Connect Desktop extends it with environment-specific behaviours.

#### `SmartActions` Collection (`jsbrains/smart-actions/smart_actions.js`)
- Extends `Collection` from `smart-collections`.
- `collection_key` and `data_dir` default to `smart_actions` for persistence and lookup.
- `init()` registers inline defaults from `opts.default_actions` via `register_included_module`.
- `register_included_module(action_key, module)` creates or updates the item with `source_type: 'included'` and attaches the module directly.
- Instances expect an `action_adapters` map containing at least a `default` adapter; items resolve adapters through this map.
- Uses the single-file AJSON data adapter so environments persist items as JSON.


#### `SmartAction` Item (`jsbrains/smart-actions/smart_action.js`)
- Extends `CollectionItem` and ensures an adapter exists; otherwise removes itself from the collection.
- `run_action(params)` executes `pre_process` hooks, runs the adapter, then applies `post_process` hooks.
- `pre_process`/`post_process` iterate module-defined callbacks in insertion order.
- Lazily instantiates adapters using `source_type` or the default adapter provided by the collection.
- Surfaces module metadata (`module`, `openapi`, `as_tool`) and persists per-action settings under `env.settings.smart_actions[this.key]`.

