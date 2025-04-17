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

### `merge_env_config(opts)`

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

## Configuration: `smart_env.config.js` and `main_env_opts`

Smart Environment uses a configuration system based on two key concepts:

1. **smart_env.config.js** - A static configuration file that defines the default environment setup
2. **main_env_opts** - Runtime options passed during initialization

The Smart Environment relies on a configuration object, `main_env_opts`, during initialization to set up the environment according to your specific needs. This configuration defines collections, modules, settings, and other options that the Smart Environment uses to orchestrate its components.

The `smart_env.config.js` file defines the core configuration for your Smart Environment instance. This file should export a configuration object that defines:

### Understanding `smart_env.config.js`

The `smart_env.config.js` file is the primary place where you define your `main_env_opts`. This file exports a configuration object that specifies how the Smart Environment should be set up. By organizing your configuration in this file, you maintain a clear separation between your application's logic and its configuration, making it easier to manage and scale.

- **`env_path`**: Specifies the base path for your environment. This could be the root directory of your application or any other path where your environment's data will reside.
- **`collections`**: Defines the collections that the Smart Environment will manage. Each collection should specify its class and any necessary adapters or item types.
- **`modules`**: Specifies the modules (also known as Smart Modules) to be included in the environment. Each module should define its class and any necessary adapters.
- **`default_settings`**: Provides default settings for the environment, which can be overridden by user settings.
- **`components`**: Defines UI components for settings, connections, or other interactive elements.

### Using `main_env_opts` in Initialization

When initializing the Smart Environment, you need to provide `main_env_opts` to the `SmartEnv.create` method. This configuration object should be imported from your `smart_env.config.js` file.


### Importance of `main_env_opts`

The `main_env_opts` object is essential for initializing the Smart Environment. It provides all the necessary configurations, including paths, collections, modules, settings, and components. By defining `main_env_opts` in the `smart_env.config.js` file, you achieve:

- **Modularity**: Keep configuration separate from application logic.
- **Reusability**: Easily share and reuse configurations across different projects or environments.
- **Maintainability**: Simplify updates and changes to the configuration without modifying the core application code.

### Multiple Mains and Configurations

If your application uses multiple mains (primary objects) or needs to manage different configurations, you can define separate `smart_env.config.js` files for each main. The Smart Environment will merge these configurations appropriately.

### Normalizing Options

The Smart Environment internally normalizes the options provided in `main_env_opts` to ensure consistency. This includes:

- **Key Formatting**: Converts camelCase keys to snake_case to maintain a consistent naming convention.
- **Class Definitions**: Ensures that collections and modules are properly defined with a `class` property.
- **Deep Merging**: Merges nested objects without overwriting existing properties unless specified.

### Key Components of `main_env_opts`

- **`env_path`**: The base path for the environment, important for file system operations.
- **`collections`**: Defines the data collections managed by the environment.
    - Each collection should have:
        - **`class`**: The constructor function or class for the collection.
        - **`data_adapter`**: Adapter for handling data persistence.
        - **`item_types`**: Definitions of item classes within the collection.
- **`modules`**: Specifies additional functionalities or services.
    - Each module should have:
        - **`class`**: The constructor function or class for the module.
        - **`adapter`**: Adapter specific to the module's operation.
- **`default_settings`**: Default configuration settings that can be overridden by user preferences.
- **`components`**: UI components for rendering settings, views, and other interactive elements.

```js
export const smart_env_config = {
  
  // Base path for the environment
  env_path: '',
  
  // Collections to initialize
  collections: {
    smart_sources: {
      class: SmartSources,
      data_adapter: SmartCollectionMultiFileDataAdapter,
      // Collection-specific options...
    },
    // Other collections...
  },

  // Available item types
  item_types: {
    SmartSource,
    SmartBlock,
  },

  // Module configurations
  modules: {
    smart_fs: {
      class: SmartFs,
      adapter: SmartFsAdapter,
    },
    smart_view: {
      class: SmartView,
      adapter: ViewAdapter,
    },
    // Other modules...
  },

  // Default settings
  default_settings: {
    file_exclusions: 'Untitled',
    folder_exclusions: 'smart-chats',
    // Other default settings...
  }
};
```

### Runtime Options (main_env_opts)

When initializing Smart Environment, you must provide runtime options through `main_env_opts`. These options typically import and extend the base configuration:

```js
import { smart_env_config } from './smart_env.config.js';

const main_env_opts = {
  ...smart_env_config,
  // Override or add runtime-specific options
  env_path: '/custom/path',
  collections: {
    ...smart_env_config.collections,
    // Add or modify collections
  }
};

// Initialize Smart Environment
const env = await SmartEnv.create(main, main_env_opts);
```

### Configuration Merging

Smart Environment merges configurations in this order:

1. Default internal options
2. Base configuration from smart_env.config.js
3. Runtime options from main_env_opts
4. Settings loaded from the environment's data directory

This allows for flexible configuration while maintaining sensible defaults.

### Required Configuration

At minimum, your configuration should specify:

- **collections**: The collection classes to initialize
- **modules**: Core modules like smart_fs, smart_view
- **item_types**: Available item types for collections
- **env_path**: Base path for the environment (if not using default)

Example of minimal configuration:

```js
const minimal_config = {
  collections: {
    smart_sources: {
      class: SmartSources,
      data_adapter: DataAdapter
    }
  },
  modules: {
    smart_fs: {
      class: SmartFs,
      adapter: FsAdapter
    }
  },
  item_types: {
    SmartSource
  }
};
```

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

