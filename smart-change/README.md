# Smart Change

Smart Change is a library that provides a standardized interface for managing and reviewing AI-suggested changes to content. It supports various file types and platforms, making it a versatile tool for your development needs.

## Why Smart Change?

Smart Change addresses the need for trust and control when AI makes changes to content. It provides:

- Control over changes made by AI
- Inline UX for reviewing changes suggested by AI
- Display of note changes made via function calls for review

## Features

- Supports multiple implementations:
  - Obsidian: dynamic code block for viewing chat history
  - VS Code: utilizes existing git conflict syntax handling
- Handles different change types:
  - `content change`: modifications to existing content
  - `location change`: moving content between files or locations

## Usage

### Initializing Smart Change

To use Smart Change, you'll typically integrate it into your existing environment:

```javascript
const smart_change = new SmartChange(env);
```

## Advanced Features

- Double-entry change UX for move/merge/rename operations
- Adapters for different file types and platforms
- Integration with Smart Entities for CRUD actions

## Development

Smart Change is designed to be modular and extensible. It consists of two main modules:

1. `smart-change`: Handles the core logic for wrapping and processing changes
2. `smart-change-ui`: Manages the rendering and user interface for reviewing changes

## Adapter Examples

### MarkdownAdapter

The MarkdownAdapter provides a native markdown syntax for changes:

```javascript
const smart_change = new SmartChange(env);
const markdown_change = smart_change.before('content', 
  { before: 'old content', after: 'new content' }, 
  'markdown'
);

console.log(markdown_change);
```

Output:
```
> [!ai_change]- AI Suggested Change
> This is the original line.
> This line has a change. → This line has been modified.
> This line is unchanged.
> → This is a new line added by AI.
```

### ObsidianMarkdownAdapter

The ObsidianMarkdownAdapter wraps changes in a `smart-change` codeblock for Obsidian compatibility:

```javascript
const smart_change = new SmartChange(env);
const obsidian_change = smart_change.before('content', 
  { before: 'old content', after: 'new content' }, 
  'obsidian_markdown'
);

console.log(obsidian_change);
```

Outputs a dynamic code-block that is rendered by Obsidian to produce an easy to use UI.

These adapters provide flexible and platform-specific ways to represent changes, enhancing the user experience across different environments.