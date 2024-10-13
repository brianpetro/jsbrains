# Smart Chat Model

A universal chat model API client that supports a wide variety of providers and models. 

Supports using OpenAI formatted requests for any provider.

## Features

- Universal adapter for multiple AI chat platforms (OpenAI, Anthropic, Google Gemini, Cohere, and more)
- Consistent OpenAI-style API interface across all supported platforms
- Support for streaming responses
- Built-in token counting and estimation
- Easy integration with custom models and APIs

## Installation

```bash
npm install smart-chat-model
```

## Model Setup

Model options may be added directly to the model instance:

```javascript
import { SmartChatModel } from 'smart-chat-model';

// Initialize smart chat model instance
const model = new SmartChatModel({
  platform_key: 'openai',
  model_key: 'gpt-4',
  api_key: 'sk-...',
});
```

Or they may be included in the settings object:

```javascript
const settings = {
  platform_key: 'openai',
  'openai': {
    model_key: 'gpt-4',
    api_key: 'sk-...',
  }
};

// Initialize smart chat model instance
const model = new SmartChatModel({ settings });
```

Model options added directly to the model instance will override options in the settings object.

The settings object may be a reference so that options can be changed after the model instance is created.

## Usage

### Basic Completion

```javascript
const response = await model.complete({
  messages: [
    { role: 'user', content: 'What is the capital of France?' }
  ],
  max_tokens: 100,
  temperature: 0.7
});

console.log(response.choices[0].message.content);
```

### Streaming Completion

```javascript
const fullResponse = await model.complete({
  messages: [
    { role: 'user', content: 'Write a short story about a robot.' }
  ],
  max_tokens: 500,
  temperature: 0.8,
  stream: true
}, {
  chunk: (chunk) => console.log('Chunk received:', chunk),
  done: (fullText) => console.log('Full response:', fullText)
});
```

### Using Tools (Function Calling)

```javascript
const weatherTool = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Get the current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City and state, e.g. San Francisco, CA' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
      },
      required: ['location']
    }
  }
};

const response = await model.complete({
  messages: [
    { role: 'user', content: 'What\'s the weather like in New York?' }
  ],
  tools: [weatherTool],
  tool_choice: 'auto'
});

// Handle the tool call in the response
if (response.choices[0].message.tool_calls) {
  const toolCall = response.choices[0].message.tool_calls[0];
  console.log('Tool called:', toolCall.function.name);
  console.log('Arguments:', toolCall.function.arguments);
  // Implement the actual weather fetching logic here
}
```

## Supported Platforms

- OpenAI
- Anthropic (Claude)
- Google (Gemini)
- Cohere
- Open Router
- Custom Local (OpenAI format)
- Custom API (OpenAI format)

## Advanced Configuration

### Custom HTTP Adapter

You can provide a custom HTTP adapter for making API requests:

```javascript
import { SmartHttpRequest } from 'smart-http-request';

const customHttpAdapter = new SmartHttpRequest({
  // Custom configuration here
});

const model = new SmartChatModel({
  // ... other options
  http_adapter: customHttpAdapter
});
```

### Platform-Specific Settings

Some platforms may have additional settings. These can be configured in the platform-specific section of the settings object:

```javascript
const settings = {
  platform_key: 'anthropic',
  anthropic: {
    model_key: 'claude-3-opus-20240229',
    api_key: 'sk-ant-...',
    high_image_resolution: true // Anthropic-specific setting
  }
};

const model = new SmartChatModel({ settings });
```

## API Reference

### `SmartChatModel`

#### Constructor

- `new SmartChatModel(options)`
  - `options.platform_key` (string): The key for the chat platform to use
  - `options.model_key` (string): The key for the specific model to use
  - `options.api_key` (string): The API key for the platform
  - `options.settings` (object): Additional settings for the model and platform

#### Methods

- `complete(request, handlers)`: Sends a completion request to the model
  - `request` (object): The request parameters (follows OpenAI format)
  - `handlers` (object): Optional handlers for streaming responses
    - `chunk` (function): Called for each chunk of a streaming response
    - `done` (function): Called when the streaming response is complete
- `count_tokens(input)`: Counts the number of tokens in the input
- `get_models(refresh = false)`: Retrieves available models for the platform
- `test_api_key()`: Tests the validity of the API key

#### Properties

- `api_key`: The current API key
- `model_key`: The current model key
- `platform_key`: The current platform key
- `endpoint`: The API endpoint URL
- `max_input_tokens`: The maximum number of input tokens for the current model
- `max_output_tokens`: The maximum number of output tokens for the current model

