## Smart Templates

Smart Templates is an advanced system combining AI-powered content generation with flexible, context-aware templating capabilities.

### Key Features

1. **Unstructured Input**: Unlike traditional template systems, Smart Templates can work with unstructured context, eliminating the need to specify exact values for each variable.

2. **Mini-Prompts**: Variables in templates act as mini-prompts, allowing for more nuanced and context-aware content generation.

3. **EJS Base Syntax**: Utilizes EJS (Embedded JavaScript) as the foundational template syntax engine.

4. **Global Variable Mapping**: Variables can be mapped to prompts, which are editable in settings and replaced using function calls.

5. **AI-Powered Content Generation**: Leverages AI models to generate content based on the provided context.

6. **Adapter Support**: Enables non-EJS template syntax through adapters, which convert to EJS for variable extraction and merging.

### Why Smart Templates?

- **Flexibility**: Adapts to various content generation needs with minimal setup.
- **Context-Awareness**: Generates content that's relevant to the surrounding context.

### Core Components

1. **SmartTemplates Class**

   The main class that handles template processing and content generation.


### Usage

```js
import { SmartTemplates } from 'smart-templates';
import fs from 'fs';

// Initialize the SmartTemplates instance
const env = { settings: { smart_templates: { var_prompts: { name: { prompt: 'name prompt' } } } } };
const smart_templates = new SmartTemplates(env);

// Load template content from a file
const templateContent = fs.readFileSync('./path/to/template.md', 'utf8');

// Parse and complete variables
const variables = await smart_templates.get_variables(templateContent);
const completed_context = await smart_templates.complete({ context: { name: 'Alice' }, system_prompt: 'Enhance the content.' });

// Render the template
const rendered_content = await smart_templates.render(completed_context);
console.log(rendered_content);
```

### Adapters

Smart Templates supports multiple template syntaxes through adapters, allowing flexibility for developers.

- **EJS Adapter**: For rendering Embedded JavaScript templates.
- **Markdown Adapter**: For rendering Markdown templates with embedded variables.

Example usage of adapters can be seen in the [tests](/test/), where both Markdown and EJS are processed and rendered.

## Markdown Templates

```md
---
title: "{{ title }}"
author: "{{ author }}"
tags: [{{ tags[] }}]
---

# {{ title }}

By: {{ author }}

## Introduction

{{ introduction }}

## Content

{{ content }}

## Conclusion

{{ conclusion }}

```

## Var Prompts (`var_prompts`)

In **Smart Templates**, `var_prompts` are a key part of the system designed to provide additional context or instructions for variables embedded in a template. These prompts guide AI-powered content generation by giving the AI more information about what each variable represents or how it should be filled in.

### How `var_prompts` Work:

- **Variable Definitions**: When a template contains placeholders for variables (e.g., `{{ name }}`, `{{ count }}`), these variables can have associated prompts that describe their expected content or provide instructions for generating that content.
- **AI Context**: The `var_prompts` are passed to the AI to generate more relevant, context-aware content. These prompts act as "mini-prompts" for each variable, helping the AI to generate appropriate text based on what the variable is intended to represent.

### Example

If a template has the following structure:

```markdown
Hello {{ name }}! You have {{ count }} new messages.
```

And the `var_prompts` are set as follows:

```json
{
  "name": { "prompt": "The name of the person being greeted." },
  "count": { "prompt": "The number of new messages." }
}
```

- **`name`**: The AI would generate a name based on the prompt "Enter the user's name".
- **`count`**: The AI would generate a number based on the prompt "Enter the number of unread messages".

### Why `var_prompts` Are Useful:

1. **Clarity for AI**: Provides the AI with specific instructions, leading to more accurate content generation.
2. **Customizability**: You can define different prompts for the same variable in different contexts, enabling fine-tuned control over how the content is generated.
3. **Dynamic Content**: Allows you to influence the way dynamic content is created without hardcoding values directly into the template.

In essence, `var_prompts` enrich the template with semantic meaning, which is crucial for generating AI-driven, contextually appropriate content.