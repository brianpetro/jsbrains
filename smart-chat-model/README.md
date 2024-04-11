# Smart Chat Model
Used to integrate OpenAI GPT-4, Antrhopic Claude, Google Gemini & Cohere Command-r in [Smart Connections](https://github.com/brianpetro/obsidian-smart-connections).

## SmartChatModel Usage Guide
```bash
npm install smart-chat-model
```

`SmartChatModel` is a comprehensive class designed to facilitate interactions with chat models, supporting features like streaming responses, handling tool calls, and customizing requests through adapters. It's built to be adaptable for various chat model configurations and platforms.
The SmartChatModel class provides a flexible and powerful way to interact with chat models, supporting advanced features like streaming, tool calls, and request customization. By following this guide, you should be able to integrate and use SmartChatModel effectively in your projects.

### Initialization
To initialize a SmartChatModel instance, you need to provide the main environment object, a model key to select the configuration from chat_models.json, and optional user-defined options to override the default model configuration.

```js
const { SmartChatModel } = require('./chat.js');

const mainEnv = {}; // Your main environment object

const modelKey = 'your_model_key'; // Key from chat_models.json

const options = {}; // Optional overrides

const chatModel = new SmartChatModel(mainEnv, modelKey, options);
```

### Making Requests
To make a request to the chat model, use the complete method. This method allows for customization of the request through options and can handle both streaming and non-streaming responses.

```js
const requestOptions = {

  messages: [{ role: "user", content: "Hello" }],

  temperature: 0.3,

  max_tokens: 100,

  stream: false, // Set to true for streaming responses

};

chatModel.complete(requestOptions)

  .then(response => {

    console.log("Response:", response);

  })

  .catch(error => {

    console.error("Error:", error);

  });
```


### Streaming Responses
If the chat model supports streaming and it's enabled in the configuration, you can set stream: true in the request options to receive streaming responses. The SmartChatModel will handle the streaming logic internally, including starting and stopping the stream as needed.

### Handling Tool Calls
The SmartChatModel can automatically detect and handle tool calls within responses. It uses the configured adapters to interpret the tool call data and executes the corresponding tool handler if a valid tool call is detected.

### Customization with Adapters
Adapters allow for customization of request and response handling. If your use case requires specific handling logic, you can create a custom adapter and specify it in the model configuration. The SmartChatModel will use this adapter for preparing requests, parsing responses, and handling tool calls.

### Counting Tokens
The count_tokens and estimate_tokens methods are available for estimating the number of tokens in a given input. This can be useful for managing request sizes and understanding the complexity of inputs.

```js
const input = "Hello, world!";

chatModel.count_tokens(input)

  .then(tokenCount => {

    console.log("Token count:", tokenCount);

  });
```

### Testing API Key
The test_api_key method allows you to verify if the provided API key is valid by making a test request to the chat model.

```js
chatModel.test_api_key()

  .then(isValid => {

    console.log("API key valid:", isValid);

  });
```




## Adapter Pattern for Platform Compatibility
The `SmartChatModel` class is designed to be extensible and compatible with various chat platforms. This is achieved through the use of the adapter pattern, which abstracts platform-specific logic into separate adapter classes. Each adapter implements a consistent interface that `SmartChatModel` can interact with, regardless of the underlying platform differences.

### Purpose
The adapter pattern allows for the easy integration of new platforms by encapsulating the API-specific logic within adapters. This ensures that the core logic of `SmartChatModel` remains clean and focused, while still being able to support a wide range of platforms.

### Key Adapter Methods
Adapters must implement the following methods to be compatible with SmartChatModel:

##### Converting options into the platform-specific request format
- `prepare_request_body(opts)`:

##### Extracting the message content from the platform's response.
- `get_message(resp_json)`
- `get_message_content(resp_json)`

##### Methods for extracting and handling tool call information from the response.
- `get_tool_call(resp_json)`
- `get_tool_name(tool_call)`
- `get_tool_call_content(tool_call)`

##### Handling streaming responses.
- `get_text_chunk_from_stream(event)`
- `is_end_of_stream(event)`: 

##### Providing token counting for input validation or estimation.
- `async count_tokens(input)` 
- `estimate_tokens(input)`

### Implementing a New Adapter
To add support for a new platform, follow these steps:
##### Create Adapter Class
1. Create a new file in the adapters directory for the platform, e.g., `new_platform.js`. 
2. Define a class `NewPlatformAdapter` that implements the required methods.

```js
class NewPlatformAdapter {
    prepare_request_body(opts) { /* Implementation */ }
    get_message_content(json) { /* Implementation */ }
    // Implement other required methods...
}

exports.NewPlatformAdapter = NewPlatformAdapter;
```
##### Integrate Adapter
1. Add the new adapter to `adapters.js` which exports all of the adapters.
2. Ensure `SmartChatModel` initializes it based on the `config.adapter`.

### Using Adapters in SmartChatModel
`SmartChatModel` interacts with adapters by checking for the implementation of specific methods and calling them. This allows for flexible handling of different platform behaviors without modifying the core logic.

For example, to prepare the request body:

```js
req.body = JSON.stringify(this.adapter?.prepare_request_body ? this.adapter.prepare_request_body(body) : body);
```

And to handle streaming responses:

```js
let text_chunk = this.adapter?.get_text_chunk_from_stream ? this.adapter.get_text_chunk_from_stream(event) : defaultTextChunkHandling(event);
```

This pattern ensures that `SmartChatModel` remains adaptable and can easily extend support to new platforms by adding corresponding adapters.