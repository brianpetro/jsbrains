# SmartEmbedModel

SmartEmbedModel is a versatile and convenient interface for utilizing various embedding models via API and locally. It provides a unified way to work with different embedding models, making it easy to switch between models or use multiple models in your projects.

## Features

- Support for multiple embedding models
- Easy-to-use API for embedding text
- Batch processing capabilities
- Token counting functionality
- Flexible configuration options
- Support for both local and API-based models

## Configuration

SmartEmbedModel can be configured with various options (`opts{}`):

### Adapters

- `adapters{}`: Available adapters. Default adapters include:
  - `transformers`
  - `openai`
  - `transformers_iframe`
  - `transformers_worker`

### Model Configuration

- `model_key`: The specific model identifier.
- `model_config{}`: Overrides defaults in `models.json`.
  - `adapter`: Selects the adapter to use (e.g., `transformers_iframe`).

### Settings

- `settings{}`: Overrides defaults in `settings_config`.
  - `model_key`: The model key to use if not set directly.

### Batch and Token Settings

- `batch_size`: Number of inputs per batch.
- `max_tokens`: Maximum tokens the model can handle.
- `use_gpu`: Enable GPU acceleration.
- `gpu_batch_size`: Batch size when GPU is enabled.

## Available Models

The available models are defined in the `models.json` file. Some of the included models are:

- TaylorAI/bge-micro-v2
- andersonbcdefg/bge-small-4096
- Xenova/jina-embeddings-v2-base-zh
- text-embedding-3-small
- text-embedding-3-large
- And more...

## Adapters

SmartEmbedModel uses adapters to interface with different embedding models. The available adapters are:

- `transformers`: Use the `transformers` library to interface with embedding models
  - `transformers_iframe`: Use the `transformers` library in an iframe
  - `transformers_worker`: Use the `transformers` library in a web worker
- `openai`: Use the `openai` library to interface with embedding models


### SmartEmbedAdapter

Base class for all adapters. Adapters must implement the following methods:

- `load()`: Initialize and load the model.
- `count_tokens(input: string | Object): Promise<number | Object>`: Count tokens in the input.
- `embed(input: string | Object): Promise<Object>`: Embed a single input.
- `embed_batch(inputs: Array<Object>): Promise<Array<Object>>`: Embed a batch of inputs.
- `unload()`: Clean up and unload the model.

### OpenAI Adapter

Uses OpenAI's API for embeddings.

```javascript
const embed_model = new SmartEmbedModel({
  model_key: 'text-embedding-ada-002',
  settings: {
    api_key: 'YOUR_OPENAI_API_KEY',
  },
  adapters: {
    openai: SmartEmbedOpenAIAdapter,
  },
});
```




## License

This project is licensed under the MIT License - see the [LICENSE](MIT_LICENSE) file for details.

## Author

Brian Joseph Petro (🌴 Brian)