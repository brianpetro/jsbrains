# Smart Actions v1

The Smart Actions collection manages executable actions that can be registered from inline modules, local files, or remote APIs. It powers higher-level environments (such as `sc-desktop`) by normalizing configuration, loading the appropriate adapter, and exposing consistent interfaces for tool execution.

## Data structures

### `SmartAction` item
- `data.key` (`string`, required): unique identifier for the action.
- `data.source_type` (`string`): determines which adapter loads the action. Supported values include `included`, `mjs`, `cjs`, and `api`.
- `data.file_path` (`string`, optional): absolute path to the module when `source_type` references local files.
- `data.api_url` (`string`, optional): endpoint invoked by the API adapter.
- `data.active` (`boolean`, default `true`): flags whether the action should run. Host environments may override this.
- `data.config` (`object`, optional): default settings rendered in host UIs. These values seed environment-level settings blocks.
- `data.*` (optional): additional metadata merged when registering actions (for example, adapter-specific options).

### Module exports
An action module can provide:
- `default(params)` — the primary function executed by the adapter.
- `pre_processes` (`object`) — keyed callbacks run before the action (collection defaults execute first).
- `post_processes` (`object`) — keyed callbacks run after the action (collection defaults execute last).
- `settings_config` (`object`, optional) — used by host environments to render settings panels.
- `openapi` (`object`, optional) — OpenAPI document converted into tool definitions.
- `tool` (`object`, optional) — direct OpenAI tool descriptor. Falls back to `openapi` when present.

## Class: `SmartAction`
Extends `CollectionItem` from `smart-collections`.

Key behaviour:
- `async init()` — loads the action adapter. If no adapter is found the item removes itself from the collection to avoid dangling references.
- `async run_action(params = {})` — executes the adapter after running pre/post processes.
- `async pre_process(params)` — runs collection-level defaults followed by module-specific pre-processes. Returns transformed params.
- `async post_process(params, result)` — runs module post-processes followed by collection defaults. Returns the final result.
- `get action_adapter` — instantiates the adapter selected by `source_type` or falls back to the default adapter.
- `get action_pre_processes` / `get action_post_processes` — convenience accessors for module-defined hooks.
- `get default_pre_processes` / `get default_post_processes` — access collection-provided hooks.
- `get as_tool()` / `get_tool()` — returns the tool definition derived from the module (`tool` export) or converted from `openapi`.
- `get_openapi()` — surfaces the module `openapi` document for downstream consumers.

## Class: `SmartActions`
Extends `Collection` from `smart-collections`.

Core responsibilities:
- `collection_key` / `data_dir` — defaults to `smart_actions` for environment registration.
- `async init()` — registers `opts.default_actions` (inline modules) using `register_included_module`.
- `get default_pre_processes()` / `get default_post_processes()` — expose configured hooks for items.
- `async register_included_module(action_key, module)` — registers inline modules as `source_type: 'included'` and assigns the module directly to the item.
- `async register_action(action_key, action_config = {})` — normalizes config (file paths, API URLs, inline modules, `data` payloads) and defers to `create_or_update`.
- `async import(file_path, action_config = {})` — derives the action key from a file name and registers the file using `register_action`.
- `async run_action(action_key, params = {})` — convenience method that resolves the item and calls `run_action`.

### Configuration options (via constructor `opts`)
- `action_adapters` (`object`, required): map of `source_type` → adapter class. `default` must be provided.
- `default_actions` (`object`, optional): inline modules keyed by action key. Registered during `init()`.
- `default_pre_processes` / `default_post_processes` (`object`, optional): keyed callbacks applied to every action instance.

## Action adapters
Adapters extend `SmartActionAdapter` and are responsible for loading and executing modules.

- `SmartActionAdapter` — base class; loads inline modules and exposes utility methods (`as_tool`, OpenAPI conversion).
- `MjsActionAdapter` — dynamically imports `.mjs`/`.js` modules via `import()`.
- `CjsActionAdapter` — loads CommonJS modules (for environments that bundle CJS actions).
- `ApiActionAdapter` — performs HTTP requests against `data.api_url` and returns the parsed response.

Adapters receive the `SmartAction` instance, enabling access to `data`, settings, and environment context.

## Typical usage
1. **Instantiate the collection** inside an environment:
	 ```js
	 const smart_actions = new SmartActions(env, {
		 action_adapters: { default: SmartActionAdapter, mjs: MjsActionAdapter, api: ApiActionAdapter },
		 default_actions: { ping: pingModule },
		 default_pre_processes: { audit: logPreProcess },
	 });
	 await smart_actions.init();
	 ```
2. **Register additional actions**:
	 ```js
	 await smart_actions.register_action('sum', { file_path: '/path/to/sum.mjs' });
	 await smart_actions.register_action('supportWebhook', { api_url: 'https://example.com/run' });
	 ```
3. **Execute an action**:
	 ```js
	 const result = await smart_actions.run_action('sum', { a: 2, b: 3 });
	 ```
4. **Integrate with UI**: host environments read `action.data.config`, `module.settings_config`, and `as_tool`/`openapi` metadata to render settings panels and expose tools to AI models.

This specification matches the behaviour used by `sc-desktop` while remaining framework-agnostic for other Smart Environment hosts.