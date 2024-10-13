# Smart Environment

Welcome to Smart Environment, the efficient, productive, and user-aligned AI-powered ecosystem for personal and professional use. Smart Environment empowers individuals by providing a suite of AI tools in a private, secure, and open-source software package.

- [Intro to Smart Environments video](https://youtu.be/0obRntW8Cto)

## Key Features

- **Local-first**: Your data stays on your device under your control
- **AI Oversight**: Review changes made by AI to maintain alignment 
- **Privacy**: Limit data-sharing to only what's necessary
- **Context Profiles**: Easily switch between home, work, and project configurations
- **Modular Architecture**: Seamlessly integrate various AI-powered Smart Modules
- **Complements Foundation Models**: Enhances capabilities of large language models

## Overview

Smart Environment is designed to be your hub for enabling personal alignment with AI. It provides an efficient, productive environment with AI-powered tools that put the user first.

Key principles:
- Maintain an open, interdependent architecture 
- Orchestrate modular Smart Modules
- Complement and enhance foundation models
- Prioritize user agency, privacy and oversight
- Loads collections (wake-up)

## Architecture

Smart Environment enables individuals and teams to leverage the power of AI while maintaining control over their data and workflows. Designed for extensibility, it provides a framework for integrating AI capabilities into your existing tools and processes.

The SmartEnv class uses a singleton pattern to ensure that only one instance of Smart Environment is created. This instance is accessible through a global reference, which is either `window` or `global`, depending on the environment.

## Interface

### `static async create(main, main_env_opts={})`

Creates or updates a SmartEnv instance.

- `main`: The main object to be added to the SmartEnv instance.
- `main_env_opts`: Options for configuring the SmartEnv instance.

Returns: The SmartEnv instance.

### `constructor(opts={})`

Initializes a new SmartEnv instance.

- `opts`: Configuration options for the SmartEnv instance.

### `async init(main, main_env_opts = {})`

Initializes the SmartEnv instance with the provided main object and options.

### `init_main(main, main_env_opts = {})`

Adds a new main object to the SmartEnv instance.

### `async load_main(main_key)`

Loads the main object and its associated collections.

### `async init_collections(config=this.opts)`

Initializes collections based on the provided configuration.

### `async load_collections(collections=this.collections)`

Loads the specified collections.

### `merge_options(opts)`

Merges provided options into the SmartEnv instance, performing a deep merge for objects.

### `unload_main(main_key)`

Unloads a main object and its associated collections and options.

### `save()`

Saves all collections in the SmartEnv instance.

### `init_module(module_key, opts={})`

Initializes a module with the given key and options.

### `async render_settings(container=this.settings_container)`

Renders the settings UI for the SmartEnv instance.

### `async save_settings(settings)`

Saves the current settings to the file system.

### `async load_settings()`

Loads the settings from the file system.

## Rendering Settings

The Smart Environment provides a flexible and extensible way to render settings for all collections and Smart Modules. This is achieved through the `render_settings` method.

### `render_settings(opts={})`

This method is responsible for rendering the settings UI for each collection and Smart Module. It utilizes a template-based approach for maximum flexibility.

#### Process Overview:

1. **Template Creation**: The method starts by creating a document fragment using the `settings_template` from `./components/settings.js`.

2. **Collection Settings**: It iterates through all initialized collections and calls their individual `render_settings` methods.

3. **Smart Module Settings**: If any Smart Modules have settings, they are also rendered.

4. **Container Handling**: If a container is provided in the options, the rendered settings are appended to it.

### Settings Template

The settings template (`./components/settings.js`) is responsible for structuring the overall settings UI:

This template:
1. Creates a document fragment
2. Renders general setting components
3. Iterates through collections, creating containers for each if not already present
    - looks for containers based on id `{collection_key}_settings`
    - if container has `data-settings-keys` attribute, it will only render the settings keys specified
4. Calls each collection's `render_settings` method
5. Renders additional setting components if needed

### Collection-Specific Settings

Each collection is expected to implement its own `render_settings` method. This method should populate the provided container with the collection's specific settings UI.

### Customization

The `render_settings` method and its associated template can be easily customized to fit specific UI requirements or to add additional functionality. This could include:

- Adding global settings sections
- Implementing tabbed interfaces for different setting categories
- Incorporating real-time setting updates
- Adding validation and error handling for setting inputs

By leveraging this flexible architecture, Smart Environment ensures that settings for all components can be easily managed and displayed in a cohesive, user-friendly interface.

## Usage

```js
import { SmartEnv } from 'smart-environment';

class MyApp {
  constructor() {
    this.init();
  }

  async init() {
    this.env = await SmartEnv.create(this, {
      env_path: '/path/to/my/app',
      collections: {
        // Define your collections here
      },
      modules: {
        // Define your modules here
      }
    });
    
    // Your app initialization code here
  }
}

const app = new MyApp();
```

