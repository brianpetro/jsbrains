# JS Brains
JS Brains is a collection of lightweight modules for building intelligent applications with JavaScript. It's designed to empower developers to easily integrate AI capabilities into their projects, with a focus on minimal dependencies, extendability, and security.

## Top-Level Overview
- [**smart-environment/**](https://github.com/brianpetro/jsbrains/tree/main/smart-environment#readme) Manages global runtime configuration, settings loading/saving, and provides a context to integrate collections, file systems, and model adapters.
- [**smart-collections/**](https://github.com/brianpetro/jsbrains/tree/main/smart-collections#readme) Generalized collection framework for persisting items (sources, blocks, messages) using JSON, AJSON, or SQLite, offering CRUD, filtering, and batch processing utilities.
	- [**smart-entities/**](https://github.com/brianpetro/jsbrains/tree/main/smart-entities#readme) Adds embeddings, semantic searches, and nearest-neighbor lookups for items within collections, enhancing entities with vector-based intelligence.
		- [**smart-sources/**](https://github.com/brianpetro/jsbrains/tree/main/smart-sources#readme) Handles structured documents (sources) and their embedded blocks, integrating with embeddings and semantic lookups.
			- [**smart-chats/**](https://github.com/brianpetro/jsbrains/tree/main/smart-chats#readme) Manages chat threads, messages, and system or user prompts, integrating with LLM-based chat models for dynamic conversation handling.
			- [**smart-templates/**](https://github.com/brianpetro/jsbrains/tree/main/smart-templates#readme) Manages templates, enabling variable substitution and EJS rendering for turning templates into prompts or documents, often integrated with chat and embed models.
		- [**smart-blocks/**](https://github.com/brianpetro/jsbrains/tree/main/smart-blocks#readme) Manages block-level granularity within sources, representing distinct sections or pieces of content for targeted embedding, search, and tool integration.
- [**smart-model/**](https://github.com/brianpetro/jsbrains/tree/main/smart-model#readme) Base classes for model abstractions and adapter management, setting a pattern for uniform access to various AI model types.
	- [**smart-chat-model/**](https://github.com/brianpetro/jsbrains/tree/main/smart-chat-model#readme) Provides a unified API for chat-completion models (OpenAI, Anthropic, Cohere), handling streaming responses, function calling, and multi-provider fallback.
	- [**smart-embed-model/**](https://github.com/brianpetro/jsbrains/tree/main/smart-embed-model#readme) Offers a uniform interface to embedding models (OpenAI, Transformers, Ollama), allowing generation of vector embeddings and efficient semantic searches.
	- [**smart-rank-model/**](https://github.com/brianpetro/jsbrains/tree/main/smart-rank-model#readme) Specializes in ranking documents using LLM-based rerankers (Cohere, local Transformer models), enabling sorting of candidate answers or documents by relevance.
- [**smart-fs/**](https://github.com/brianpetro/jsbrains/tree/main/smart-fs#readme) Abstracts file system operations through multiple adapters (Node.js FS, Obsidian Vault, Web File System Access), adding support for ignore patterns, AJSON, and other features.
- [**smart-view/**](https://github.com/brianpetro/jsbrains/tree/main/smart-view#readme) Handles UI and rendering tasks for settings interfaces, markdown previewing, and icon sets, with adapters tailored to Node.js, Obsidian, or browser environments.

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

## Detailed Hierarchical Structure
### smart-environment/
- **SmartEnv**: Central hub orchestrating configuration, settings, and top-level references.
### smart-collections/
- **Collection**: Manages sets of items with CRUD and filtering.
- **Item**: Represents a single record (e.g., source, message) within a collection.
- **Data Adapters**: Implement persistent storage strategies (JSON, AJSON, SQLite).
#### smart-entities/
- **SmartEntity**: Extends items with embedding capabilities.
- **Embeddings & Lookup**: Provides vector similarity search, top-N results, and semantic filtering.
##### smart-sources/
- **SmartSource**: Represents a document (note, file) with embeddings and blocks.
- **SmartBlocks**: Handles embedded logical units (like headings, paragraphs).
- **File/Markdown Adapters**: Imports, updates, and merges content from various file formats.
###### smart-chats/
- **SmartThread**: Represents a conversation thread.
- **SmartMessage**: Represents an individual user or assistant message.
- **Model Integration**: Retrieves completions, applies function calls, and renders results within the chat flow.
###### smart-templates/
- **SmartTemplate**: Represents a template file ready to be rendered into prompts or content.
- **Variable Parsing & EJS Rendering**: Inserts dynamic data into templates.
- **Integration with Chat/Embed Models**: Turns templates into model prompts, processing responses to create outputs.
### smart-model/
- **SmartModel**: Base class for standardized adapter loading and initialization.
- **Adapter Interface**: Defines how models are invoked (e.g., complete(), embed()).
#### smart-chat-model/
- **SmartChatModel**: Provides `complete()` for chat conversations.
- **Adapters (OpenAI, Anthropic)**: Translate requests into provider-specific payloads.
- **Request/Response Mappers**: Normalize streaming and function calling responses.
#### smart-embed-model/
- **SmartEmbedModel**: Provides `embed()` and `embed_batch()` for text vectors.
- **Transformers, OpenAI, Ollama Adapters**: Manage local or remote embedding services.
- **Token Counting & Truncation**: Ensures requests fit model constraints.
#### smart-rank-model/
- **SmartRankModel**: Provides `rank()` for sorting documents by relevance.
- **Cohere, Transformers Adapters**: Handle rerank endpoints or local models.
- **Response Normalization**: Outputs standard {index, score, text} arrays.
### smart-fs/
- **SmartFs**: Wraps file operations with advanced features like `.gitignore` support.
- **Adapters (NodeFs, Obsidian, WebFS)**: Same FS API, different backends.
- **Append, Rename, List & Recursive Operations**: Provides uniform FS interactions in any environment.
### smart-view/
- **SmartView**: Renders settings UI, markdown previews, and icons through adapters.
- **Adapter (Node, Obsidian)**: Chooses the right rendering logic (e.g., Obsidian’s MarkdownRenderer).
- **Setting Components**: Dropdowns, toggles, text fields, and advanced inputs are standardized.

## Key Architectural Concepts

### Adapters Everywhere
- **Adapter Pattern**: Each subsystem (FS, Models, Views) uses adapters so you can easily switch implementations.
- **Minimal Core Logic**: The core logic doesn’t assume a platform or provider, making code environment-agnostic.

### Collections & Items
- **Data Persistence**: Items (like sources, messages, templates) are just JSON objects managed by collections.
- **Query & Filter**: Collections offer a uniform API to load, save, filter, and batch process items.

### Models via a Common Interface
- **Chat vs. Embed vs. Rank**: Different model classes share a similar pattern: a main class and multiple adapters.
- **Unified Requests**: Send a request in OpenAI format; the adapter converts it to the provider's native schema.

### Layered Functionality
- **Entities Build on Collections**: Embeddings and semantic queries extend the basic collections layer.
- **Sources & Blocks**: Sources are entities with content that can be block-parsed, embedded, and transformed.
- **Chats & Templates**: Add another layer for user interaction (conversations) and content generation (templates).

---

By understanding the directories, classes, and their relationships, and following these best practices, you can confidently navigate, extend, and utilize the JSBrains architecture for your project.

## Architecture: The Adapter Pattern

JS Brains utilizes the adapter pattern as a core architectural principle, providing flexibility and extensibility across different AI models and platforms. This approach offers several benefits:

1. **Unified Interface**: Developers can use a consistent API regardless of the underlying AI model or service, simplifying code and reducing cognitive load.

2. **Easy Integration**: New AI models or services can be added by creating new adapters without changing the core module code, allowing for rapid expansion of capabilities.

3. **Flexibility**: Users can switch between different AI providers or models by simply changing the adapter, without modifying their application code. This enables easy experimentation and optimization.

4. **Future-Proofing**: As new AI models emerge, they can be quickly integrated into JS Brains through new adapters, ensuring the library stays current with the latest advancements in AI technology.

5. **Abstraction of Complexity**: The adapter pattern hides the complexities of different AI services behind a common interface, allowing developers to focus on building features rather than managing integrations.

This architectural choice aligns with our principles of extendability and ease of development, allowing JS Brains to evolve with the rapidly changing AI landscape while providing a stable foundation for developers.

## Use Cases: Smart Connections

One of the primary applications of JS Brains is the Smart Connections plugin for Obsidian, which demonstrates the power and flexibility of our modules. Smart Connections leverages several JS Brains modules to create an intelligent, AI-powered knowledge management system:

1. **Semantic Search**: Using the Smart Embed Model and Smart Ranker Model, Smart Connections enables users to find semantically related notes and content within their knowledge base.

2. **AI-Powered Chat**: The Smart Chat Model allows users to interact with their notes using natural language, getting intelligent responses based on their personal knowledge base.

3. **Dynamic Knowledge Graphs**: Smart Entities and Smart Collections work together to create and maintain dynamic knowledge graphs, helping users visualize and navigate their interconnected ideas.

4. **Automated Tagging and Categorization**: Smart Chunks and Smart Entities collaborate to automatically analyze and categorize content, making knowledge management more efficient.

5. **Personalized Recommendations**: By combining various modules, Smart Connections can provide personalized content recommendations, helping users discover relevant information within their notes.

These use cases demonstrate how JS Brains modules can be combined to create powerful, AI-driven applications that enhance productivity and knowledge management.

## Our Mission: Empowering Individuals with AI

At the core of JS Brains is a mission to empower individuals with AI tools that respect their privacy and enhance their productivity. We believe that:

1. **AI should serve the user**: Our tools are designed to align with user interests and values, not corporate profit motives.

2. **Privacy is paramount**: We prioritize user data protection and provide transparency in our AI implementations.

3. **Open-source drives innovation**: By making our core modules open-source, we foster a community of developers who can contribute to and benefit from collective advancements in AI technology.

4. **Accessibility is key**: We strive to make AI tools accessible to developers of all skill levels, democratizing access to advanced AI capabilities.

By adhering to these principles, we aim to create a ecosystem of AI tools that users can trust and rely on to enhance their personal and professional lives.