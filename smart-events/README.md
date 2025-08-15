# Smart Events

## Overview
Coordinate asynchronous events across JSBrains modules.

## Architecture
```mermaid
flowchart TD
	M[Smart Modules] --> Evt[Smart Events]
	Evt --> A[Smart Actions]
```
Smart Events centralize event propagation, letting actions react to changes from any module.