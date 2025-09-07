## Data Structures
### `SmartAction` Item
A single action is stored (and often persisted) as a `SmartAction` item. Its primary data fields:
- `action.data.key`
	- Type: `String`
	- Required: Yes
	- Description: Unique identifier for the action (must be unique across the collection).
- `action.data.source_type`
	- Type: `String`
	- Description: Indicates how the action is loaded or executed. Common values:
		- `'mjs'` (ES module via `import`)
		- `'cjs'` (CommonJS module via `require`)
		- `'api'` (remote API call via `fetch`)
		- `'included'` (base/default: directly provided/embedded module)
- `action.data.file_path`
	- Type: `String`
	- Optional
	- Description: File path to a local `.mjs` or `.cjs` (or `.js`) module. Used when `source_type` is `'mjs'` or `'cjs'`.
- `action.data.api_url`
	- Type: `String`
	- Optional
	- Description: URL to a remote API endpoint if `source_type` is `'api'`.
- `action.data.active`
	- Type: `Boolean`
	- Default: `true`
	- Description: If `false`, this action will not run unless explicitly forced via an official override or other logic (see “Action Execution and Overrides” below).
- `action.data.api_spec` or `action.data.openapi`
	- Type: `Object`
	- Optional
	- Description: May include OpenAPI/Swagger spec details relevant to the action’s API.
	- Note: In the code, the actual OpenAPI object is typically placed in the action’s _module_ (`this.module.openapi`). If you store it in `data.api_spec` or `data.openapi`, a data adapter or your initialization logic may merge it into `this.module`.
### `SmartActionGroup` Item
A group is an object that references multiple `SmartAction` items, typically to run them in some coordinated way or environment:
- `group.data.actions`
	- Type: `Object`
	- Description: Keyed by `SmartAction.key`, each sub-object can override certain per-action flags (e.g. `active`).
	- Example:
		```js
		{
			"[actionKey]": {
				"active": true
			},
			...
		}
		```
- `group.data.settings`
	- Type: `Object`
	- Optional
	- Description: Contains environment-level or group-level configuration (credentials, environment options, etc.) that might be referenced by the group’s actions.
> Note: The `SmartActionGroup` implementation is not fully shown here. In general, it extends `CollectionItem` (via `smart-collections`) and references multiple `SmartAction` items.
## Class: `SmartAction`
Extends `CollectionItem` (from `smart-collections`).
### Purpose
Represents one “action” that can be:
- Loaded from a local ES module (`.mjs`) or CommonJS module (`.cjs` or `.js`).
- Tied to a remote API (if `source_type === "api"`).
- Embedded “directly included” (`source_type === "included"`).
### Key Data / Fields
- `data.key`
- `data.source_type`
- `data.file_path` (optional)
- `data.api_url` (optional)
  A remote endpoint for `source_type: "api"`.
- `data.active` (default `true`)
  If `false`, the action is “disabled,” unless an override is in place (see below).
- `data.api_spec` or `data.openapi` (optional)
### Methods
#### `run_action(params = {})`
The main entry point to execute the action.
High-level flow:
1. Pre-process
	`params = await this.pre_process(params)`
2. Check Active
	- If `this.active === false` and there is no official override, return a “disabled” message.
	- If the group override is disabled, return a “disabled” message.
3. Call Adapter
	- `let result = await this.action_adapter.run(params)`
4. Post-process
	- `result = await this.post_process(params, result)`
5. Return the final result (and logs it to the console).
#### `pre_process(params)`
- Collects and runs:
	1. Default pre-process callbacks from the parent collection (`this.collection.default_pre_processes`).
	2. Action-specific pre-process callbacks (`this.module.pre_processes`).
- Returns the transformed `params`.
#### `post_process(params, result)`
- Collects and runs:
	1. Action-specific post-process callbacks (`this.module.post_processes`).
	2. Default post-process callbacks from the collection.
- Returns the final `result`.
### Internal Adapters
`SmartAction` determines which adapter to instantiate based on `data.source_type`. Adapters load or call the underlying logic:
- `SmartActionAdapter` (base)
	- Generic runner. Expects the module to expose a function (usually `.default` or a named export matching the action key).
- `MjsActionAdapter`
	- Dynamically imports an ES module (`.mjs` or `.js`) via `import()`.
- `CjsActionAdapter`
	- Uses `require()` (via `createRequire`) to load a CommonJS module (`.cjs` or `.js`).
- `ApiActionAdapter`
	- Makes a `fetch()` call (e.g. POST) to a remote `api_url`.
## Class: `SmartActions`
Extends `Collection` (from `smart-collections`).
### Purpose
A collection of `SmartAction` items. Provides:
- Creation/update of actions (`create_or_update`).
- Registration helpers for `.mjs`, `.cjs`, or included modules.
- Global pre-process and post-process callbacks that apply to all actions.
### Properties & Methods
- `data_dir`
	- Default: `'smart_actions'`
		- The subfolder where action data may be stored (if using a file-based adapter).
- `init()`
	- Called to initialize the collection. In the code, it can register any default actions from `this.opts.default_actions`.
- `register_included_module(action_key, module)`
	- Creates (or updates) a `SmartAction` with `source_type: 'included'`.
		- Directly assigns the passed `module` as the action’s logic.
- `register_mjs_action(file_path)`
	- Creates/updates a `SmartAction` with `source_type: 'mjs'` and the given `file_path`.
- `register_cjs_action(file_path)`
	- Creates/updates a `SmartAction` with `source_type: 'cjs'` and the given `file_path`.
- `register_included_module(action_key, module)`
	- Creates (or updates) a `SmartAction` with `source_type: 'included'`.
		- Directly assigns the passed `module` as the action’s logic.
- `get default_pre_processes()`
	- Returns an array/list of collection-level pre-process callbacks.
- `get default_post_processes()`
	- Returns an array/list of collection-level post-process callbacks.
- `run_action(actionKey, params)`
	- Shortcut method (often inherited from the base `Collection` or used explicitly) that looks up the action by `key` and calls `action.run_action(params)`.
#### Typical “smart-collections” Methods
Because `SmartActions` extends `Collection`, it inherits:
- `create_or_update(itemData)`
- `delete_many(keys)`
- `process_save_queue()`
- `process_load_queue()`
- etc.
## Typical Usage Flow
1. Create Environment
	- A higher-level environment (e.g., `SmartEnv`) instantiates `SmartActions` as one of its collections.
2. Register Actions
	- Call registration methods, for example:
		```js
		await smart_actions.register_mjs_action('/path/to/someAction.mjs');
		await smart_actions.register_cjs_action('/path/to/otherAction.js');
		await smart_actions.register_included_module('builtinAction', someBuiltinModule);
		```
	- Or supply them as “default_actions” in the environment opts.
3. (Optional) Create `SmartActionGroup`s
	- A group references a subset of these actions and can set group-level overrides:
		```js
		group.data.actions = {
			"someAction": { active: true },
			"apiAction": { active: false }
		};
		```
	- The group might store credentials or environment config in `group.data.settings`.
4. Run an Action
	- Either call the collection directly:
		```js
		const result = await smart_actions.run_action("someKey", { foo: "bar" });
		```
	- Or call via a group’s helper:
		```js
		const groupResult = await myGroup.run_action("someKey", { foo: "bar" });
		```
	- The corresponding adapter is loaded (`mjs`, `cjs`, `api`, etc.), the pre-process hooks run, the underlying function/endpoint is called, then post-process hooks run.