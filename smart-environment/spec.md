# smart-environment Specification

Exports from `index.js`:

| Export | Description |
| --- | --- |
| `SmartEnv` | Singleton class managing configuration, collections and modules. |

## Key Methods

| Method | Notes |
| --- | --- |
| `static create(main, opts)` | Adds main config and returns the singleton instance. |
| `static add_main(main, opts)` | Merges new main into the environment. |
| `static unload_main(main)` | Removes a main and its collections. |
| `wait_for({ main })` | Resolves when the env or main is ready. |
| `init_collections(config)` | Instantiates collection classes. |
| `load_collections(collections)` | Processes load queues for all collections. |
| `render_component(key, scope, opts)` | Renders a UI component via SmartView. |

## Data Flow

```mermaid
flowchart TD
  A[create()] --> B[add_main]
  B --> C[init_collections]
  C --> D[load_collections]
  D --> E[Environment ready]
```

