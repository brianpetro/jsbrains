### api_spec.md

Location: at the root of the smart-entities folder.

Focuses on the public methods of `SmartEntities` (the collection) and `SmartEntity` (the item), referencing the inline JSDoc in `smart_entities.js` and `smart_entity.js`.



#### Purpose

- Show conceptual usage for the entity-based methods, especially embedding or vector queries.
- Reference JSDoc for specifics of parameters.



#### Public Methods Overview (SmartEntities)

1. `async nearest(vec, filter={})`  
    See JSDoc in `SmartEntities.nearest`.
    
    - Usage Notes:
        - Delegates to `entities_vector_adapter.nearest(vec, filter)`.
        - Returns items sorted by descending similarity.
    - Side Effects:
        - May read item vectors from memory or from an external store.
2. `async furthest(vec, filter={})`  
    See JSDoc in `SmartEntities.furthest`.
    
    - Usage Notes:
        - Delegates to `entities_vector_adapter.furthest(vec, filter)`.
    - Side Effects:
        - Similar to `nearest`, but sorts ascending by similarity.
3. `async lookup(params={})`  
    See JSDoc in `SmartEntities.lookup`.
    
    - Usage Notes:
        - Embeds a “hypothetical” text query (e.g., a user question) via the `embed_model`, then finds nearest items.
    - Side Effects:
        - Calls `this.embed_model.embed_batch` behind the scenes.
4. `async process_embed_queue()`  
    See JSDoc in `SmartEntities.process_embed_queue`.
    
    - Usage Notes:
        - Invokes the `entities_vector_adapter.process_embed_queue` for items flagged `_queue_embed`.
    - Side Effects:
        - Potentially large embedding calls to external or local ML models.



#### Public Methods Overview (SmartEntity)

1. `async nearest(filter={})`  
    See JSDoc in `SmartEntity.nearest`.
    
    - Usage Notes:
        - Returns neighbors to this item’s `vec`, using `this.collection.nearest_to`.
    - Side Effects:
        - None beyond read access to item vectors.
2. `async find_connections(params={})`  
    See JSDoc in `SmartEntity.find_connections`.
    
    - Usage Notes:
        - A convenience method that calls `nearest` with optional filters, caching results.
3. `async get_embed_input(content=null)`  
    See JSDoc in `SmartEntity.get_embed_input`.
    
    - Usage Notes:
        - Called before embedding. By default, a no-op that child classes override to populate `.embed_input`.
4. `set vec()` / `get vec()`  
    See JSDoc in `SmartEntity.vec`.
    
    - Usage Notes:
        - Mirrors the vector in `item.data.embeddings[modelKey]`.
    - Side Effects:
        - Setting `vec` unsets `_queue_embed` and queues a save.



### data_spec.md

Location: at the root of the smart-entities folder.

Describes the shape of `SmartEntity` data, especially embeddings (`entity.data.embeddings[...]`) and how entity metadata is stored.



#### Purpose

- Show how a single entity’s `.data` is structured, particularly embeddings.
- Note domain-specific rules about storing and discarding vectors from old or inactive models.



#### Entity Data Model

- `SmartEntity.data`  
    Typically looks like:
    
    ```js
    {
      path: "string",            // The file/path or ID for this entity
      embeddings: {              // Where vector data for different models is stored
        "model_key": {
          vec: [0.12, 0.75, ...], // The vector
          last_embed: {           // Additional metadata about the last embedding
            hash: "string",       // e.g. a content hash
            tokens: 123
          },
          error: "string"         // If an error was encountered during embedding
        },
        // Possibly other model_keys
      },
      // Additional domain-specific fields
    }
    ```
    
- `_queue_embed` (non-persistent)
    
    - A Boolean indicating that the item should be embedded by `SmartEntities`.
- `embed_input` (transient, not always stored in `.data`)
    
    - The textual input used when generating an embedding.



#### Data Flows

1. Reading
    
    - Entities may read their content from external sources (files, notes) to populate `embed_input`.
2. Embedding
    
    - `process_embed_queue()` uses `embed_input` to generate or update `data.embeddings[modelKey].vec`.
3. Model Switching
    
    - If the environment changes the active `embed_model_key`, old embeddings might be removed.
4. Deletion
    
    - If the entity is removed, the adapter may mark or remove its vector data.
    - Some systems simply delete `.data.embeddings` for that item.



### adapters/adapter_spec.md

Location: inside the `smart-entities/adapters/` directory.

Defines how the vector adapters (e.g. `EntitiesVectorAdapter` and `EntityVectorAdapter`) integrate. References the JSDoc in `adapters/_adapter.js` and any default adapters.



#### Purpose

- Describe the role of `EntitiesVectorAdapter` and `EntityVectorAdapter` in storing or retrieving embeddings.
- Summarize the usage of near/far queries.



#### Adapter Interfaces

1. `EntitiesVectorAdapter`  
    See JSDoc in `adapters/_adapter.js` for param details.
    - Abstract base for:
        - `nearest(vec, filter)`
        - `furthest(vec, filter)`
        - `embed_batch(entities)`
        - `process_embed_queue()`
2. `EntityVectorAdapter`  
    See JSDoc in `adapters/_adapter.js`.
    - Abstract base for:
        - `get_vec()`
        - `set_vec(vec)`
        - `delete_vec()`



#### Default Implementation

- `DefaultEntitiesVectorAdapter` / `DefaultEntityVectorAdapter`
    - See JSDoc in `adapters/default.js`.
    - Stores vectors in `item.data.embeddings[model_key].vec`.
    - Provides in-memory nearest/furthest by computing cosine similarity (`cos_sim`).
    - Embeds items in batches through `collection.embed_model`.



#### Data Flow Assumptions

- Embedding
    - The adapter calls `item.get_embed_input()` for each item to be embedded.
    - Then `embed_model.embed_batch` is used to generate vectors.
- Performance
    - Typically uses a chunked approach, e.g., processing items in sets of 50 or 100 at once.
- Nearest/Furthest
    - Filter out items that have no vector.
    - Return results sorted by similarity in descending (nearest) or ascending (furthest) order.

### diagram %% fold %%

```mermaid
flowchart TD

%%--- Define classes ----------------------------------------------
classDef envGroup fill:#FFEFD5,stroke:#FF7F50,stroke-width:2px,color:#000
classDef collGroup fill:#E6FFE6,stroke:#009900,stroke-width:2px,color:#000
classDef itemGroup fill:#ECECFF,stroke:#0000CC,stroke-width:2px,color:#000
classDef adapterGroup fill:#FFF8DC,stroke:#C0C000,stroke-width:2px,color:#000
classDef embedGroup fill:#F5F5DC,stroke:#996600,stroke-width:2px,color:#000

%%=== SmartEnv ====================================================
subgraph S1["SmartEnv (Global)"]
direction TB
    A1((Create/Reuse))
    A2["merge_env_config()"]
    A3["init_main()"]
    A4["load_main()"]
end
class A1,A2,A3,A4 envGroup

%%=== Collections ================================================
subgraph S2["Collections"]
direction TB
    B1["init_collections()"]
    B2["process_load_queue()"]
    B3["process_save_queue()"]
end
class B1,B2,B3 collGroup

%%=== Items =======================================================
subgraph S3["Collection Items"]
direction TB
    C1((create_or_update))
    C2{"_queue_load\n_queue_save"}
    C3((Item Data))
end
class C1,C2,C3 itemGroup

%%=== Adapters ====================================================
subgraph S4["Adapters (Data & Vector)"]
direction TB
    D1[CollectionDataAdapter]
    D2[ItemDataAdapter]
    D3[EntitiesVectorAdapter]
    D4[EntityVectorAdapter]
end
class D1,D2,D3,D4 adapterGroup

%%=== Embedding & Queries =========================================
subgraph S5["Embedding & Queries"]
direction TB
    E1["embed_batch()"]
    E2["nearest() / furthest()"]
    E3["lookup()"]
end
class E1,E2,E3 embedGroup

%%--- Arrows ------------------------------------------------------
%% SmartEnv flow
A1 --> A2
A2 --> A3
A3 --> A4
%% SmartEnv to Collections
A4 --> B1

%% Collections
B1 --> B2
B1 --> B3

%% Items
B1 --> C1

%% Item queueing triggers
C1 --> C2
%% queue -> load or save
C2 --> B2
C2 --> B3

%% load/save interacts with Adapters
B2 -- "invoke" --> D1
B2 -- "invoke" --> D2
B3 -- "invoke" --> D1
B3 -- "invoke" --> D2

%% item data references adapters
C3 --> D3
C3 --> D4

%% embedding & queries
D3 --> E1
D3 --> E2
D4 --> E2
E1 --> C3
E2 --> C3
E3 --> E2

```
