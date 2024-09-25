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

Singleton pattern is used to ensure that only one instance of Smart Environment is created. This instance is accessible through a global reference, which is either `window` or `global`, depending on the environment.

## interface
### `static async create(main, opts={})`
- detects if `global_ref.smart_env` exists
    - creates `global_ref.smart_env` if not
    - returns `global_ref.smart_env`

#### `opts={}`
- `global_ref` specified in constructor
    - must be object
        - defaults to `window || global`
    - sets `smart_env` property


## `env`

![](../assets/Smart%20Env%20env%20property.png)

## `render_settings(opts={})`
- renders settings UI for each collection and Smart Modules

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
