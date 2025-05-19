# JS Brains

JS Brains is a collection of lightweight modules for building intelligent applications with JavaScript. It's designed to empower developers to easily integrate AI capabilities into their projects, with a focus on minimal dependencies, extendability, and security.

---

## Top-Level Overview

- [**smart-environment/**](https://github.com/brianpetro/jsbrains/tree/main/smart-environment#readme)  
  Manages global runtime configuration, settings loading/saving, and provides a context to integrate collections, file systems, and model adapters.

- [**smart-collections/**](https://github.com/brianpetro/jsbrains/tree/main/smart-collections#readme)  
  Generalized collection framework for persisting items (sources, blocks, messages) using JSON, AJSON, or SQLite, offering CRUD, filtering, and batch processing utilities.
  - [**smart-entities/**](https://github.com/brianpetro/jsbrains/tree/main/smart-entities#readme)  
    Adds embeddings, semantic searches, and nearest-neighbor lookups for items within collections, enhancing entities with vector-based intelligence.
    - [**smart-sources/**](https://github.com/brianpetro/jsbrains/tree/main/smart-sources#readme)  
      Handles structured documents (sources) and their embedded blocks, integrating with embeddings and semantic lookups.
        - [**smart-chats/**](https://github.com/brianpetro/jsbrains/tree/main/smart-chats#readme)  
          Manages chat threads, messages, and system or user prompts, integrating with LLM-based chat models for dynamic conversation handling.
    - [**smart-blocks/**](https://github.com/brianpetro/jsbrains/tree/main/smart-blocks#readme)  
      Manages block-level granularity within sources, representing distinct sections or pieces of content for targeted embedding, search, and tool integration.

- [**smart-model/**](https://github.com/brianpetro/jsbrains/tree/main/smart-model#readme)  
  Base classes for model abstractions and adapter management, setting a pattern for uniform access to various AI model types.
  - [**smart-chat-model/**](https://github.com/brianpetro/jsbrains/tree/main/smart-chat-model#readme)  
    Provides a unified API for chat-completion models (OpenAI, Anthropic, Cohere), handling streaming responses, function calling, and multi-provider fallback.
  - [**smart-embed-model/**](https://github.com/brianpetro/jsbrains/tree/main/smart-embed-model#readme)  
    Offers a uniform interface to embedding models (OpenAI, Transformers, Ollama), allowing generation of vector embeddings and efficient semantic searches.
  - [**smart-rank-model/**](https://github.com/brianpetro/jsbrains/tree/main/smart-rank-model#readme)  
    Specializes in ranking documents using LLM-based rerankers (Cohere, local Transformer models), enabling sorting of candidate answers or documents by relevance.

- [**smart-fs/**](https://github.com/brianpetro/jsbrains/tree/main/smart-fs#readme)  
  Abstracts file system operations through multiple adapters (Node.js FS, Obsidian Vault, Web File System Access), adding support for ignore patterns, AJSON, and other features.

- [**smart-view/**](https://github.com/brianpetro/jsbrains/tree/main/smart-view#readme)  
  Handles UI and rendering tasks for settings interfaces, markdown previewing, and icon sets, with adapters tailored to Node.js, Obsidian, or browser environments.

---

## Vision and Mission

Our mission is to democratize AI development for JavaScript developers, providing a robust toolkit that simplifies the creation of smart, AI-powered applications while maintaining high standards of performance and security. We aim to:

- Lower the barrier to entry for AI integration in web applications
- Promote best practices in AI development and deployment
- Foster a community of developers building intelligent, scalable applications
- Empower individuals with AI tools that respect their privacy and enhance productivity

## Core Principles

- **Minimal Dependencies**: Designed to be lightweight and secure, reducing potential vulnerabilities and simplifying integration.
- **Web-Native**: Optimized for performance in web environments, ensuring smooth operation across various platforms.
- **Extendable**: Flexible architecture allowing for custom solutions and easy integration of new AI models or services.
- **Developer-Friendly**: Simplifies AI integration for developers of all skill levels, with clear documentation and intuitive APIs.
- **Security-Focused**: Minimizes vulnerabilities through careful dependency management and secure coding practices.
- **User-Aligned**: Prioritizes user privacy and control, ensuring that AI tools serve the user's best interests.

---

## Comprehensive Documentation

Below is a **condensed** but **comprehensive** reference to these libraries, detailing directory structures, classes, and usage patterns.

### Contents
- [Overview & Intent](#overview--intent)
- [Repository Summaries](#repository-summaries)  
  - [smart-groups](#smart-groups)  
  - [smart-directories](#smart-directories)  
  - [smart-model](#smart-model)  
  - [smart-embed-model](#smart-embed-model)  
  - [smart-chat-model](#smart-chat-model)  
  - [smart-rank-model](#smart-rank-model)  
  - [smart-http-request](#smart-http-request)  
  - [smart-clusters](#smart-clusters)  
  - [smart-view](#smart-view)  

- [Key Concepts & Core Classes](#key-concepts--core-classes)
- [Directory & File Structures](#directory--file-structures)
- [Usage Flow & Adapters](#usage-flow--adapters)
- [Testing & Scripts](#testing--scripts)
- [Additional Implementation Notes](#additional-implementation-notes)

---

### Overview & Intent

The **"smart-*"** set of libraries in JS Brains comprise a modular ecosystem for:

- Managing **entities**, **sources**, **blocks**, **directories**, **clusters**, and **templates**.
- Integrating with **AI models** (embeddings, chat completions, ranking).
- Handling **HTTP requests** and rendering **views** or **settings** in multiple environments.

---

### Repository Summaries

#### smart-groups
- A library for grouping items (like sources, files).
- `SmartGroups` manages multiple `SmartGroup` items.  
- Provides logic to batch update, compute median vectors, label management, etc.

#### smart-directories
- Specializes in **managing embedded directories** (folder structures with embeddings).
- Extends `SmartGroups` with:
  - `SmartDirectories` (collection),
  - `SmartDirectory` (item).
- Ensures parent directories, read from a file system, track directory stats, etc.

#### smart-model
- Base classes for "smart" model packages.
- `SmartModel` handles:
  - Adapter lifecycle,
  - Settings config,
  - State transitions.
- Acts as a foundation for specialized model classes (chat, embed, rank).

#### smart-embed-model
- Focuses on **embedding** logic: local or API-based.
- `SmartEmbedModel` extends `SmartModel`.
- Provides `embed()` or `embed_batch()` for text → vector.
- Integrations: OpenAI Embeddings, local Transformers, Ollama, etc.

#### smart-chat-model
- A universal chat model API with multi-provider support (OpenAI, Anthropic, etc.).
- Normalizes requests/responses to an "OpenAI-like" schema.
- Supports streaming, function calling, tools, and more.

#### smart-rank-model
- Specialized for **ranking** tasks, e.g., re-ordering documents by relevance.
- `SmartRankModel` extends `SmartModel`, offering `rank(query, documents)`.
- Adapters for local or remote rerank endpoints (Cohere, Transformers).

#### smart-http-request
- Minimal, flexible library for making HTTP requests with adapters.
- `SmartHttpRequest` main class, plus adapters for `fetch`, `Obsidian requestUrl`, etc.
- Standardizes the request/response flow.

#### smart-clusters
- Manages **clusters** of vectorized items.
- `SmartClusters` extends `SmartGroups`; each cluster is a `SmartCluster`.
- Adapters can build clusters from items with vectors (`cluster_sources()` logic).

#### smart-view
- Renders dynamic settings/UI across various environments.
- `SmartView` with environment-specific adapters like `SmartViewNodeAdapter` or `SmartViewObsidianAdapter`.
- Offers standard setting types (dropdown, toggle, text, etc.) plus markdown rendering.


---

### Key Concepts & Core Classes

- **Adapters**: Provide environment or provider-specific logic for data, models, or rendering.
- **Collections & Items**: Common pattern for storing entities in memory with persistent data adapters.
- **SmartModel**: The base for specialized AI models (chat, embed, rank).
- **Integration**: Modules can be combined for advanced use-cases (embedding + clustering, chat + templates, etc.).

---

### Directory & File Structures

Common structure:

```
smart-xyz
├── adapters
│   └── ...
├── index.js
├── package.json
├── [library_name].js
└── test
    └── ...
```

---

### Usage Flow & Adapters

1. **Install** relevant `smart-*` library.
2. **Import** classes and adapters.
3. **Initialize** a collection/model with chosen adapters.
4. **Call** main methods (`init()`, `build_groups()`, `embed()`, `complete()`, `rank()`, etc.).
5. **Process** the results or items as needed.

---

### Testing & Scripts

- Uses **AVA** for tests (`npm test`).
- Example: `smart-clusters/test/source_clusters.test.js` tests building clusters from embedded sources.
- Some integration tests generate content (like `test_content.js`).

---

### Additional Implementation Notes

- “env” object (SmartEnv) orchestrates references: `env.smart_sources`, `env.smart_clusters`, etc.
- The system heavily uses the **adapter** pattern.
- Some advanced features:
  - Median vectors or center embeddings in groups/clusters.
  - Function calling in chat models.
  - AI-based variable completions in templates (`var_prompts`).

---

## Architecture: The Adapter Pattern

JS Brains adopts the adapter pattern as a core architectural principle, granting **flexibility** and **extensibility** across various AI models and platforms. This approach provides several key advantages:

1. **Unified Interface**  
   Developers can operate with a single, consistent API—regardless of the underlying AI model or service—drastically reducing complexity and mental overhead.

2. **Straightforward Integration**  
   New AI models or services can be added simply by authoring new adapters. This means no need to modify core modules, enabling fast growth of features and capabilities.

3. **Configurable & Agile**  
   Switching between AI providers or models is as easy as pointing to a different adapter. This makes testing, optimization, and experimentation effortless.

4. **Future-Proofing**  
   As new AI models emerge, JS Brains can adopt them quickly through dedicated adapters—staying current with cutting-edge AI developments.

5. **Abstracted Complexity**  
   The adapter layer hides the intricate differences in AI services, allowing developers to concentrate on crafting product features rather than juggling integrations.

By employing the adapter pattern, JS Brains remains both **highly extensible** and **developer-friendly**, evolving with a rapidly shifting AI landscape while providing a stable foundation for building sophisticated applications.

---

## Use Cases: Smart Connections

A prime example of JS Brains in action is the **Smart Connections** plugin for Obsidian, showcasing how various modules work together to create an AI-driven knowledge management environment:

1. **Semantic Search**  
   Leveraging the Smart Embed Model and Smart Rank Model, Smart Connections allows users to discover semantically similar notes and content within their knowledge base.

2. **AI-Powered Chat**  
   The Smart Chat Model integrates with personal notes to offer natural language interactions, letting users query and receive AI-generated responses from their own knowledge pool.

3. **Dynamic Knowledge Graphs**  
   Combining Smart Entities with Smart Collections yields live knowledge graphs, helping users navigate and understand relationships between different ideas.

4. **Automated Tagging & Categorization**  
   Using Smart Chunks and Smart Entities, Smart Connections automatically analyzes and classifies content, streamlining the user’s organizational efforts.

5. **Personalized Recommendations**  
   By fusing ranking, embedding, and knowledge of user data, Smart Connections can suggest relevant, personalized notes and materials.

These capabilities illustrate how JS Brains modules can be orchestrated to form a robust, AI-based workflow that significantly enhances both productivity and knowledge exploration.

---

## Our Mission: Empowering Individuals with AI

JS Brains centers on empowering users with AI tools that protect privacy and increase productivity. Our guiding principles include:

1. **User-Focused AI**  
   Our solutions are designed to align with user interests and goals, not corporate agendas.

2. **Privacy First**  
   We prioritize secure data handling and transparency in every AI integration we create.

3. **Open-Source Innovation**  
   By open-sourcing core modules, we foster collective advancement in AI tech—any developer can contribute or benefit.

4. **Accessibility**  
   We strive to make advanced AI techniques accessible to all developers, lowering barriers to entry and increasing adoption.

Adhering to these ideals, JS Brains aims to provide AI tools that users can trust and leverage to enhance their personal and professional projects.