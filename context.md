# `SmartEnv`
Core runtime singleton that orchestrates mains, collections, modules, configuration, file-system access, and settings for a Smart Environment instance.
##### WHY
- Provides a **single source of truth** for configuration, collections, settings, and modules.  
- Enables multiple “mains” (plugins/apps) to **co-exist** in the same process while sharing one environment and file-system cache.  
- Abstracts boilerplate for *deep-merging config*, *hot-reloading on code upgrades*, *batched adapter load/save*, and *component rendering* so that downstream Smart Modules focus on domain logic.
##### Data properties
###### `state`
Current lifecycle state: `'init' | 'loaded'`.

###### `collections`
Plain object keyed by `collection_key`; values are either a collection instance (`Collection`) or sentinel strings `'init' / 'loaded'` during bootstrap.

###### `_components`
Memoized renderers for UI components, keyed by `<scope>-<component_key>`.

###### `smart_env_configs`
Global record of `{ main_key: { main, opts } }` objects for every main currently registered.

###### `_config`
Lazy-constructed, deeply-merged view of **all** `smart_env_config` objects, cached after first access.  
See `config` getter.

###### `primary_main_key`
Key of the main whose config wins when two mains declare the same module/collection.

###### `load_timeout`
`setTimeout` id used to debounce environment load / reload.

###### `smart_settings`
Instance of `SmartSettings` responsible for persisting user-visible environment settings.

###### `smart_view`
Lazily-instantiated module used as the rendering engine for component fragments.

###### `fs`, `data_fs`
Module instances (usually `SmartFs`) providing read/write access to the vault (`fs`) and to the env-data directory (`data_fs`).

##### Static properties
###### `version`
Monotonically-increasing number that triggers a hot reload when newer code is evaluated.

###### `global_ref`
Reference to `window` (browser), `document.window` (sandbox), or `global` (Node) used for global singleton storage.

###### `global_env`, `smart_env_configs`
Global getters/setters that expose the singleton instance and its accumulated config objects.

###### `should_reload`
Boolean indicating whether a new `SmartEnv` instance should replace the existing singleton (e.g. on version bump).

##### Methods / API
###### `constructor(opts = {})`
Initialises base fields; *does **not** eagerly load collections or mains*.

###### `static async create(main, main_env_opts = main.smart_env_config)`
Entry-point used by every main.  
Adds/merges the main’s config, reloads the singleton if necessary, debounces `load()` behind `env_start_wait_time`, and returns the singleton.

###### `static add_main(main, main_env_opts)`
Registers a main, converts its constructor name to `snake_case`, and attaches an `env` getter to the instance.

###### `static unload_main(main)`
Removes the main’s config so that the next hot reload excludes it.

###### `async load()`
End-to-end bootstrap:
1. Loads raw vault files (`fs.load_files()`),  
2. Instantiates `SmartSettings` and merges `default_settings`,  
3. `init_collections()` to call static `init` on every declared collection class,  
4. Invokes `ready_to_load_collections()` hooks on each main,  
5. `load_collections()` to process adapter queues,  
6. Marks `state = 'loaded'`.

###### `async init_collections(config = this.config)`
For each declared collection in `config.collections`  
– merges `default_settings`,  
– awaits the collection class’s static `init(env, opts)` (if present),  
– registers the collection placeholder in `collections`.

###### `async load_collections(list = this.collections)`
Calls `process_load_queue()` on every collection instance (unless `prevent_load_on_init` is `true`) and records load-time metrics.

###### `ready_to_load_collections(main)`
Optional awaitable hook a main can implement to delay collection loading (e.g. until user settings resolve).

###### `save()`
Iterates every collection and delegates to `process_save_queue()`.

###### `render_settings(container = this.settings_container)`
Renders environment-level settings plus each collection’s settings UI via the configured `settings_template` component.

###### `render_component(component_key, scope, opts = {})`
Finds a renderer in `opts.components`, binds it to a `smart_view` instance, and returns the generated DOM fragment (or “component not found” placeholder).

###### `get config()`
On first access:
1. Deep-clones and normalises every main’s `smart_env_config`,  
2. Merges them with `merge_env_config()` (no overwrite of existing keys),  
3. Caches and returns the composite object.

###### `get env_data_dir()`
Heuristically determines (or creates) the `.smart-env/` folder that stores `smart_env.json` and data files.

###### `async load_settings()` / `save_settings(settings)`
Persists user settings to `${env_data_dir}/smart_env.json`, automatically layering `default_settings`, saved settings, runtime overrides, and vault-specific file/folder exclusions.

###### `update_exclusions()`
Refreshes the `SmartSources` FS cache when the user updates exclusion lists.

# `Collection`
Encapsulates a group of `CollectionItem` instances, offering CRUD, filtering, batch load-save queues, settings, and adapter orchestration.
Represents and manages a group of `Item` instances, providing:

- A flat key-to-instance store
- Filtering, listing, and CRUD
- Batch load/save through a data adapter
- Support for rendering settings

##### Data properties
###### `env`
Execution environment providing shared services, adapters, configuration, and helpers.
###### `items`
Plain object keyed by ``item.key`` containing every `CollectionItem` instance.
###### `config`
Shorthand for ``env.config``.
###### `_data_adapter`
Lazy-instantiated cache of the active data adapter.

##### Methods
###### `constructor(env, opts = {})`
Creates a collection, registers it on `env`, and sets initial state and configuration overrides.
###### `static init(env, opts = {})`
One-shot async helper that instantiates the collection, runs ``init()``, and registers it in ``env.collections``.
###### `create_or_update(data = {})`
Finds an existing item matching `data` (by key or deep merge) or creates a new one, triggers validation, `init`, and save queueing.
###### `find_by(data)`
Lightweight helper used by ``create_or_update`` to locate an item that would deep-equal the supplied `data`.
###### `filter(filter_opts = {})`
Returns an array of items passing the key-based predicate rules in `filter_opts` or a custom predicate function.
###### `list(filter_opts)`
Alias for ``filter``.
###### `process_load_queue()`
Delegates queued loads to ``data_adapter.process_load_queue``.
###### `process_save_queue(opts = {})`
Delegates queued saves to ``data_adapter.process_save_queue``; if `opts.force` is truthy, forces every item into the save queue.
###### `render_settings(container?, opts = {})`
Renders the collection’s settings component into `container`, lazily creating a DOM fragment if none supplied.
# `CollectionItem`
Represents a single record within a `Collection`, handling data sanitization, keyed identity, lazy load/save, validation, and helper rendering.
Encapsulates data and behavior for a single entity in a `Collection`, including:

- Unique key generation
- Lazy load with ``_queue_load``
- Data validation/sanitization

##### Data properties
###### `data`
Arbitrary, application-specific payload; merged deeply on updates.

###### `_queue_load`, `_queue_save`  
Boolean flags used by collection adapters to batch work.
###### `deleted`
Marks the item for removal on the next save pass.

##### Methods
###### `constructor(env, data = null)`
Copies deep defaults along the inheritance chain, merges supplied `data`, and populates mandatory metadata.
###### `update_data(data)`
Deep-merges `data` into ``this.data``, returning `true` if a change occurred.
###### `queue_load()`, `queue_save()`
Flag the item for batched adapter processing.
###### `load()`, `save()`
Immediate one-off calls that delegate to the collection’s data adapter and update `loaded_at` or reset the queue flag on success.
###### `delete()`
Soft-deletes the item by setting `deleted` and queueing a save.
###### `filter(filter_opts)`
Predicate used by ``Collection.filter``, supporting extensive key inclusion/exclusion rules.

# `CollectionDataAdapter`
Abstract facade for collection-level persistence. Concrete adapters supply I/O details while re-using the queue orchestration logic.

##### Data properties
###### `collection`
Reference to the parent `Collection`.
###### `env`
Shorthand for ``collection.env``.

##### Methods
###### `load_item(key)`, `save_item(key)`, `delete_item(key)`
Abstract per-item operations to be provided by subclasses.
###### `process_load_queue()`, `process_save_queue()`
Abstract batch processors; typical implementations iterate queues and call the per-item helpers.
###### `load_item_if_updated(item)`
Utility that defers to the item adapter’s ``load_if_updated`` when external timestamps exceed ``item.loaded_at``.

### `FileCollectionDataAdapter` (extends `CollectionDataAdapter`)
Adds ``this.fs``, a filesystem abstraction sourced from ``collection.data_fs`` || ``env.data_fs``.

##### Methods
###### `fs` *getter*
Returns the active filesystem interface.

## `ItemDataAdapter`
Abstract per-item persistence handler used by `CollectionDataAdapter`.

##### Data properties
###### `item`
The `CollectionItem` instance being persisted.

##### Methods
###### `load()`, `save(ajson?)`, `delete()`
Abstract I/O primitives to be implemented by concrete subclasses.
###### `data_path` *getter*
Abstract string identifying the storage location; subclasses derive file paths or keys.
###### `load_if_updated()`
Abstract optimisation hook for conditional reloads.

### `FileItemDataAdapter` (extends `ItemDataAdapter`)
Provides shared filesystem helpers for file-backed adapters.

##### Methods
###### `fs` *getter*
Resolves the same filesystem interface as its collection counterpart.
###### `load_if_updated()`
Stats the `data_path` file and reloads if its `mtime` exceeds ``item.loaded_at`` by at least one minute.

# `EntitiesVectorAdapter`
Abstract base-class defining the vector / embedding contract for an entire `Collection`. Concrete adapters add storage-, index- and model-specific behavior while re-using batching logic.

##### WHY
- Decouples vector logic from higher-level domain collections.
- Permits drop-in swaps between in-memory, SQLite, Pinecone, etc. back-ends.

##### Data properties

###### `collection`
Parent `Collection` instance.

##### Methods / API

###### `nearest(vec, filter?)`
Return *descending* list of `{ item, score }` most similar to `vec`.

###### `furthest(vec, filter?)`
Return *ascending* list of `{ item, score }` least similar to `vec`.

###### `embed_batch(entities)`
Embed the batch and write results back to each entity.

###### `process_embed_queue()`
Safe, debounced orchestration around repeated `embed_batch` passes.


# `EntityVectorAdapter`
Per-item counter-part of `EntitiesVectorAdapter`.

##### Data properties

###### `item`

`SmartEntity` the adapter belongs to.

##### Methods / API

###### `get_vec()` `set_vec(vec)` `delete_vec()`
CRUD for the stored vector; overridden by concrete adapters.


# `DefaultEntitiesVectorAdapter`
In-memory implementation that keeps vectors inside each entity’s `data.embeddings`.

##### Data properties

###### `_is_processing_embed_queue`
Guards against concurrent embedding passes.

###### *stats* (`embedded_total`, `total_tokens`, `total_time`, …)
Runtime metrics, exposed to notices/UI.

##### Methods / API

###### `nearest()` / `furthest()`
Single-pass reservoir-sampling via `results_acc` / `furthest_acc`.

###### `process_embed_queue()`
Chunked embed-batch loop with progress / completion notices, queue-halt & resume helpers, automatic `queue_save()` flushing.

###### `_calculate_embed_tokens_per_second()`
Utility for live telemetry.


# `DefaultEntityVectorAdapter`
Thin shim that proxies `vec` to `item.data.embeddings[embed_model_key].vec`.


# `SmartEntities`
Concrete `Collection` for vector-aware domain entities (notes, blocks, etc.).

##### Data properties

###### `entities_vector_adapter`
Instance of `DefaultEntitiesVectorAdapter`.

###### `model_instance_id`
Stable id used to mount the embedding-model UI.

###### `_embed_queue`
Computed cache of pending entities.

##### Methods / API

###### `init()` → `load_smart_embed()`
Hot-loads the configured model; falls back gracefully.

###### `nearest_to(entity, filter?)`
Helper delegating to `nearest(entity.vec, filter)`.

###### `nearest(vec, filter?)` / `furthest(vec, filter?)`
Pass-through to `entities_vector_adapter`.

###### `lookup(params)`
Hybrid “semantic + lexical” multi-hypothetical search.

###### `process_embed_queue()`
Delegates to adapter; cascades to block-collection when enabled.

###### `embed_model_changed()`
Full reload & re-render cycle after a settings flip.

##### Settings (`settings_config`)

`min_chars`, block-render options, results\_limit, link-exclusion toggles, etc.


# `SmartEntity`
Vector-enabled `CollectionItem`.

##### Data properties

###### `entity_adapter` *(deprecated)*
Legacy alias for `vector_adapter`.

###### `_queue_embed`
Boolean flag consumed by collection’s embed-queue.

###### `_embed_input`
Cached prompt string fed to the embedding model.

##### Methods / API

###### `init()`
Auto-queues embed when vec missing / wrong dims; purges stale model blobs.

###### `get_embed_input(content?)` *(abstract)*
Override to supply raw text; default implementation is a no-op.

###### `nearest(filter?)`
Entity-level convenience wrapper.

###### `find_connections(params?)`
Domain-specific graph search (delegated to `actions.find_connections`).

###### `queue_embed()`
Marks entity for the next embedding pass.

###### `vec` *(getter/setter)*
Transparent access through `vector_adapter`.

###### `should_embed` / `is_unembedded`
Fast heuristics for queueing & housekeeping.


# `SmartSources`
Specialised `SmartEntities` that sync with an on-disk vault and optionally manage per-source blocks.

##### Data properties

###### `source_adapters` *(computed)*
Map `<extension> → AdapterClass` derived from `env.opts.collections.smart_sources.source_adapters`.

###### `fs`
Lazy `SmartFs` instance with user-defined exclusion patterns.

###### `search_results_ct`
Running counter for lexical search limiting.

###### `_excluded_headings`
Cached CSV setting → array.

##### Methods / API

###### `init_items()`
Filesystem scan that instantiates items *only* for recognised extensions.

###### `process_source_import_queue({ process_embed_queue, force })`
Bulk importer → embedder → saver combo with live notices.

###### `lookup(params)`
Extends parent lookup with block-level results when `embed_blocks` is enabled.

###### `run_clear_all()` / `run_clean_up_data()`
Maintenance utilities (wipe cache, prune stale blocks, rewrite `.ajson` bundles).

###### `build_links_map()`
In-memory backlinks graph used by Smart Connections UI.

##### Settings (`settings_config`)
Auto-merged adapter-specific sections, file/folder exclusion CSVs, etc.


# `SmartSource`
File-backed `SmartEntity` representing a single note or document.

##### Data properties

###### `_queue_import`
Flagged when disk version newer than last import.

###### `data.blocks`
Sparse `{ sub_key: [start, end] }` line-range map used for per-block entities.

##### Methods / API

###### `import()`
Orchestrates adapter `import()`, content parsing & embed queuing.

###### `get_embed_input(content?)`
Generates breadcrumb-prefixed, length-capped text for the embed model, honouring `excluded_lines`.

###### `read(opts?)` / `append(content)` / `update(full_content)` / `remove()`
CRUD facade delegating to `source_adapter`.

###### `move_to(entity_ref)` / `merge(content, opts)`
Composable refactor helpers (cross-note moves, block-level merges).

###### `get_block_by_line(line)`
Fast line-lookup via cached `data.blocks`.

###### `excluded` / `is_gone`
Filesystem-aware state flags.

###### `open()`
Jump into note via host plugin.
# `SmartBlocks`
Granular `Collection` class that manages every `SmartBlock` extracted from **all** `SmartSource` notes in the vault.  
Extends `SmartEntities`, inheriting vector-aware search plus batching helpers.

##### WHY
- Collates every parsed block into a single searchable index for semantic or lexical look-ups.  
- Orchestrates embed/save queues **once per vault** rather than per source, minimising redundant work.  
- Provides a collection-level settings UI so users can toggle block-level embeddings at runtime.

##### Data properties
###### `source_collection`
Pointer to the vault-level `SmartSources` instance that owns the physical files.

###### `fs`
Convenience getter that proxies `source_collection.fs` for direct disk I/O.

###### `notices`
Shared UI notifications helper injected by the hosting plugin/app.

###### `settings_config`
Computed schema merged with parent defaults; adds the `"embed_blocks"` toggle.

##### Methods / API
###### `init()`
No-op because blocks are imported by `SmartSources`; present to satisfy the `Collection` contract.

###### `process_embed_queue()`
Delegates the heavy lift to `SmartSources.process_embed_queue()`; keeps the Collection stub for API parity.

###### `expected_blocks_ct`
Derived count of block records expected after the next full import (sum of every source’s `data.blocks`).

###### *stub* CRUD helpers (`prune`, `refresh`, `search`, …)  
Declared but `throw` by default – SmartSources own those workflows.

# `SmartBlock`
Single immutable slice of content – a heading, paragraph, list item, etc. – located within a `SmartSource` file.  
Extends `SmartEntity` so it inherits embeddings, nearest-neighbour helpers, and queue flags.

##### Data properties
###### `_embed_input`
Cached prompt string assembled by `get_embed_input()` to avoid re-reading file content inside large batches.

###### `data.lines`
`[start, end]` 1-based line range inside the source; the canonical location of the block on disk.

###### `block_adapter`
Lazy resolver that instantiates the correct `BlockContentAdapter` (e.g. Markdown) on first access.

##### Methods / API
###### `get_embed_input(content?)`
Builds `"breadcrumbs\n\ncontent"` payload; prunes or re-uses cache depending on size/model changes.

###### `read()`
Safe wrapper around `block_adapter.read()` that converts “not found” errors to sentinel text for display.

###### `append(content)` `update(new_content)` `remove()` `move_to(to_key)`
Thin façades that delegate the heavy lifting to the adapter then `queue_save()` the entity.

###### `queue_embed()` / `queue_import()`
Bubble block-level requests up to `SmartSources` so related source and sibling blocks stay consistent.

###### *computed getters*  
`breadcrumbs` `should_embed` `next_block` `sub_blocks` … expose rich state without extra allocations.

# `SmartModel`
Adapter-centric wrapper that standardises model configuration, state transitions, and settings plumbing.

##### WHY
- Decouples **model orchestration** (load, unload, switch) from **model logic** (rank, embed, chat).  
- Allows multiple back-ends (OpenAI, local LLM, re-ranker, etc.) to present a unified API surface.  
- Ships a ready-made settings component with dropdowns that hot-reload the chosen adapter.

##### Data properties
###### `state`
Finite-state-machine flag: `'unloaded' | 'loading' | 'loaded' | 'unloading'`.

###### `_adapter`
The **live** instance created from `adapters[adapter_name]`; all public calls are proxied here.

###### `settings`
Mutable JSON blob persisted by the host; holds adapter / model / UI preferences.

###### `adapters`
Map `{ adapter_name: AdapterClass }` injected at construction.

##### Methods / API
###### `constructor(opts)`
Validates `opts.adapters`, wires defaults, but does **not** eagerly load adapters.

###### `initialize()`
One-shot convenience – picks `adapter_name`, calls `load_adapter()`, then awaits `load()`.

###### `load()` / `unload()`
Transition-safe wrappers that toggle `state` guards around `invoke_adapter_method('load'|'unload')`.

###### `load_adapter(adapter_name)`
Hot-swap utility: instantiates new adapter, unloads previous one, ensures fresh `state = 'loaded'`.

###### `invoke_adapter_method(method, …args)`
Generic proxy with pre-flight checks (`ensure_adapter_ready`) so callers stay adapter-agnostic.

###### `settings_config`
Auto-generated schema containing the **platform dropdown** plus any subclass extras via `process_settings_config()`.

# `SmartModelAdapter`
Abstract super-class that concrete adapters (OpenAI, Ollama, cohere, etc.) extend.

##### Data properties
###### `model`
Back-reference to the owning `SmartModel` instance.

###### `state`
Lifecycle flag identical to the parent model (`'unloaded'`, `'loaded'`, …).

##### Methods / API
###### `load()` `unload()`
Optional async hooks where adapters open HTTP clients, warm caches, or tear them down.

###### `get_models(refresh?)`
Return or refresh the provider’s model catalogue; default implementation `throw`s so subclasses must implement.

###### `get_models_as_options()`
Sync helper that converts `models` into `{ value, name }` tuples for `<select>` controls.

###### *state helpers* (`is_loaded`, `is_loading`, …)  
Sugar accessors so UI code can poll status without peeking at private flags.


# `SmartChatModel`

##### WHY
- Bridges **domain-agnostic chat workflows** with the Smart Model runtime so Obsidian, browser add-ons, or CLIs can invoke any LLM through a single API surface.
- Normalizes *streaming*, *function / tool calling*, *token estimation* and *model catalogue* across OpenAI-style and idiosyncratic providers.
- Exposes ergonomic helpers (`complete`, `stream`, `count_tokens`) while delegating provider quirks to pluggable adapters.
- This hierarchy **decouples** chat orchestration from HTTP mechanics and from vendor quirks.
- New providers add a \~150-line adapter without touching core runtime.
- UI components pull capabilities (streaming, tool use) straight from adapter metadata, enabling feature flags at runtime.
##### Data properties

###### `scope_name`
Fixed string `'smart_chat_model'` used for settings scoping.

###### `defaults`
Static `{ adapter: 'openai' }` merged into user settings and opts.

###### `adapter`
Live instance built from `adapters[ adapter_name ]`; all chat operations proxy here.

##### Methods / API

###### `constructor(opts = {})`
Wires `adapters`, `settings`, runtime `opts`; passes merged object to `SmartModel`.

###### `complete(req)`
Promises a *single, non-streaming* OpenAI-formatted response via `adapter.complete(req)`.

###### `stream(req, handlers?)`
Starts a streaming session; bubbles `chunk`, `error`, `done` callbacks to caller.

###### `stop_stream()`
Idempotent guard that invokes `adapter.stop_stream()` if a stream is active.

###### `count_tokens(input)`
Provider-aware token estimator routed to `adapter.count_tokens`.

###### `test_api_key()`
Delegates to `adapter.test_api_key()` then re-renders settings UI.

###### `validate_config()`
Returns `{ valid, message }` from the adapter’s own checks.

###### `get settings_config()`
Composes root dropdown (`adapter`) with `adapter.settings_config`; placeholder `[CHAT_ADAPTER]` tokens are post-processed per selection.

###### `get models()` `get can_stream()` `get can_use_tools()`
Syntactic sugar exposing adapter capabilities.


# `SmartChatModelAdapter`

*Abstract* subclass of `SmartModelAdapter`.

##### WHY

* Lifts common chat-centric affordances (API key, model picker, tool-support toggle) above concrete provider code.
* Guarantees that every provider exposes **identical hooks**: `complete`, `stream`, `count_tokens`, `get_models`, `validate_config`.

##### Data properties

###### `static defaults`
Provider stubs set human label, `type`, `endpoint`, `streaming`, `models_endpoint`, `default_model`, `signup_url`.

###### `model`
Back-reference to owning `SmartChatModel` instance.

##### Methods / API

###### `complete(req)` `stream(req, handlers)` `count_tokens(input)` `test_api_key()`
Declared abstract – must be implemented by provider adapters.

###### `settings_config`
Adds generic controls:
  • `[CHAT_ADAPTER].model_key` (dropdown, refreshable)
  • `[CHAT_ADAPTER].refresh_models` (button)
Child classes merge-in API-key fields or extras.

###### `validate_config()`
Common checks (model selected, API key present, tool capability) overridable by providers.


# `SmartChatModelApiAdapter` (extends `SmartChatModelAdapter`)
Concrete base for **HTTP LLM services**.

##### Data properties

###### `_http_adapter`
Lazy `SmartHttpRequest` (Fetch adapter by default).

###### `req_adapter` / `res_adapter`
Classes used to translate *OpenAI ⇄ Platform* schemas (default to generic versions).

##### Methods / API

###### `complete(req)`
Builds provider request via `new req_adapter(this, …).to_platform()`, performs HTTP call, converts result with `res_adapter.to_openai()`.

###### `stream(req, handlers)`
Fire-and-forget SSE / chunked streamer (`SmartStreamer`) plus incremental response aggregation (`res_adapter.handle_chunk`).

###### `get_models(refresh?)`
Fetches catalogue once, caches in `adapter_settings.models`, triggers settings re-render.

###### `parse_model_data(model_data)`
Provider-specific transformer **must** return a `{ id: modelObj }` map.

###### Helpers

`get models_request_params()` constructs authorised fetch; `is_end_of_stream(event)` abstract; `stop_stream()` safe terminator.

# `SmartChatModelRequestAdapter`
Stateless translator for **outgoing** payloads.

##### Data properties

###### `adapter`
Provider adapter instance.

###### `_req`
Raw, OpenAI-ish request supplied by client code.

##### Methods / API

###### `to_platform(streaming?)`
Delegates to `to_openai()` unless overridden; provider subclasses override (`to_anthropic`, `to_gemini`, …).
Internally hydrates headers, default tokens, tool specs, o1-quirks etc.

# `SmartChatModelResponseAdapter`
Stateless translator for **incoming** payloads.

##### Data properties

###### `adapter`
Provider adapter instance.

###### `_res`
Mutable response object; initialised from static `platform_res` sentinel during streaming.

##### Methods / API

###### `handle_chunk(chunk)`
Provider-aware accumulator that mutates `_res` in-place (text deltas, tool-calls, usage).
Default version understands OpenAI-style `"data: [DONE]"`.

###### `to_openai()`
Returns `{ id, object: 'chat.completion', created, choices, usage }` plus raw payload.

# `SmartStreamer`
Thin XHR / SSE helper that emits `open`, `message`, `error`, `abort`, `readyStateChange`.
Splits chunks with configurable regex, supports custom headers and credentials, and exposes `end()` for manual aborts.

# `SmartEmbedModel`
Adapter-centric runtime that standardises **text-embedding** workflows (token counting, batch orchestration, GPU toggles) across local and remote back-ends.

##### WHY
- Wraps every provider behind a **single, streaming-agnostic API** (`embed`, `embed_batch`, `count_tokens`).
- Hot-swappable adapters mean UI & higher-level code stay model-agnostic.
- Shares the Smart Model settings infrastructure so dropdowns, callbacks, and hot-reloads work exactly like chat models.

##### Data properties
###### `scope_name`
Constant `'smart_embed_model'`, used for settings scoping.

###### `defaults`
Static `{ adapter: 'transformers' }` merged into opts/settings.

###### `adapter`
**Live** instance created from `adapters[ adapter_name ]`; all public calls proxy here.

##### Methods / API
###### `constructor(opts = {})`
Wires `adapters`, GPU flags, batch sizes, `model_config`, user `settings`.

###### `initialize()`
One-shot helper: picks `adapter`, calls `load_adapter()`, awaits `load()`.

###### `count_tokens(input)`
Delegates to `adapter.count_tokens`.

###### `embed(input)`
Sugar for single string/object → `[ embed_batch ][0 ]`.

###### `embed_batch(inputs)`
Chunk-aware batch orchestration routed to `adapter.embed_batch`.

###### `get batch_size()`
Returns `adapter.batch_size`, auto-adjusting for GPU.

###### `settings_config`
Root dropdown (`adapter`) + adapter-specific config via `process_settings_config()`.

# `SmartEmbedAdapter`
*Abstract* superclass; concrete adapters (Transformers, OpenAI, Ollama, …) share:

##### Methods / API
###### `count_tokens(input)` `embed(input)` `embed_batch(inputs)`
Declared abstract – must be implemented by subclasses.

###### `settings_config`
Base dropdown for `[ADAPTER].model_key`; subclasses merge extras.

###### *helpers*
`dims` `max_tokens` `batch_size` dynamic getters that respect GPU & user overrides.

# `SmartEmbedModelApiAdapter`
HTTP-centric subclass for **remote** services (OpenAI, Ollama, Cohere …).

##### Data properties
###### `_http_adapter`
Lazy `SmartHttpRequest` (Fetch by default).

##### Methods / API
###### `embed_batch(inputs)`
1. Delegates per-item `prepare_embed_input()`
2. Builds platform request via `new req_adapter(this, inputs).to_platform()`
3. Retries with back-off on 4 × errors
4. Parses with `new res_adapter(this, resp).to_openai()`

###### `prepare_request_headers()` `validate_api_key()` `handle_request_err()` generic helpers.

### `SmartEmbedModelRequestAdapter`
Stateless translator for **outgoing** payloads.
*Implement* `prepare_request_body()` to return platform schema.

### `SmartEmbedModelResponseAdapter`
Stateless translator for **incoming** payloads.
*Implement* `parse_response()` and return an `[{ vec, tokens }]` array.

# `SmartEmbedMessageAdapter`
Base for **isolated-context** adapters (iframe / worker).  
Queues promise-based RPC (`_send_message`, `_handle_message_result`) around an underlying transport supplied by subclasses.

##### Methods / API
###### `_post_message(message_data)`
Abstract transport hook (iframe → `contentWindow.postMessage`, worker → `worker.postMessage`).

### `SmartEmbedIframeAdapter`
Runs the full embed pipeline inside a hidden `<iframe>` for browser-only GPU / WASM sand-boxing.

### `SmartEmbedWorkerAdapter`
Web-Worker counterpart for thread off-loading; re-uses shared workers keyed by `model_key` to avoid reload costs.


