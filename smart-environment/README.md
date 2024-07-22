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
