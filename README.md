# JS Brains
JS Brains is a collection of lightweight modules for building intelligent applications with JavaScript, like [Smart Connections](https://github.com/brianpetro/obsidian-smart-connections). It's designed to empower developers to easily integrate AI capabilities into their projects, with a focus on minimal dependencies, extendability, and security.

## Vision

Our mission is to democratize AI development for JavaScript developers, providing a robust toolkit that simplifies the creation of smart, AI-powered applications while maintaining high standards of performance and security.

- **Minimal Dependencies**: Designed to be lightweight and secure
- **Web-Native**: Optimized for performance in web environments
- **Extendable**: Flexible architecture allowing for custom solutions
- **Developer-Friendly**: Simplifies AI integration for developers of all skill levels
- **Security-Focused**: Minimizes vulnerabilities through careful dependency management

## [Docs](https://brianpetro.github.io/jsbrains)

## Principles of JS Brains

### Minimal Dependency
JS Brains is designed to operate with low to no external dependencies, making it a lightweight and secure option for users. This principle ensures that the project can be easily integrated into existing systems without introducing complex dependencies that might affect performance or security.

### Web-Native and Lightweight
The project is built to be web-native, emphasizing performance and ease of use within web environments. This aligns with the goal of making the project lightweight, ensuring that it does not consume excessive resources, which is crucial for maintaining fast and responsive applications.

### Extendability
JS Brains is structured to be extendable, allowing developers to build upon the existing base to create tailored solutions that meet specific needs. This flexibility is a core principle, as it empowers developers to innovate and expand the functionality according to emerging requirements or opportunities.

### Ease of Development and Security for End-Users
The project aims to simplify the development process, making it easier for developers to implement AI into their projects. At the same time, it prioritizes minimal dependencies to maximize security for end-users, addressing potential vulnerabilities that could arise from third-party libraries.

### Mission-Oriented Design
JS Brains is mission-driven, with a clear purpose to enable JavaScript developers to build AI applications easily. This involves creating a framework that provides the necessary tools and resources while being straightforward enough for developers at various skill levels to use effectively.

## Core Modules

- **Smart Chat Model**: Facilitates intelligent conversational interfaces
- **Smart Chunks**: Efficient text processing and analysis
- **Smart Collections**: Manages and organizes AI-related data structures
- **Smart Embed Model**: Handles text embedding for semantic analysis
- **Smart Entities**: Entity recognition and management system
- **Smart Ranker Model**: Implements content ranking algorithms


## Smart Environment

JS Brains uses a Smart Environment (`env`) as a central orchestrator for module interactions. This design allows for seamless integration between different components and facilitates easy extension of functionality.

## Architecture: The Adapter Pattern

JS Brains utilizes the adapter pattern as a core architectural principle, providing flexibility and extensibility across different AI models and platforms.

### What is the Adapter Pattern?

The adapter pattern is a structural design pattern that allows objects with incompatible interfaces to collaborate. In JS Brains, it's used to create a consistent interface for interacting with various AI models and services.

### How JS Brains Implements the Adapter Pattern

Each core module in JS Brains (such as SmartChatModel, SmartEmbedModel, etc.) uses adapters to interface with different AI providers or model implementations. This approach offers several benefits:

1. **Unified Interface**: Developers can use a consistent API regardless of the underlying AI model or service.
2. **Easy Integration**: New AI models or services can be added by creating new adapters without changing the core module code.
3. **Flexibility**: Users can switch between different AI providers or models by simply changing the adapter, without modifying their application code.
4. **Future-Proofing**: As new AI models emerge, they can be quickly integrated into JS Brains through new adapters.

### Example: SmartChatModel Adapters

The SmartChatModel module includes adapters for various chat models:

- OpenAI GPT adapter
- Anthropic Claude adapter
- Google PaLM adapter
- Custom model adapter

By using these adapters, developers can easily switch between different chat models or even use multiple models in the same application, all through a consistent interface.

This architectural choice aligns with our principles of extendability and ease of development, allowing JS Brains to evolve with the rapidly changing AI landscape while providing a stable foundation for developers.