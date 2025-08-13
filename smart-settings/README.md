# Smart Settings

## Overview
Manage configuration shared across JSBrains modules.

## Architecture
```mermaid
flowchart TD
	Conf[Smart Settings] --> Mods[Smart Modules]
	Conf --> Env[Smart Environment]
```
Smart Settings provide centralized configuration feeding both the environment and individual modules.
