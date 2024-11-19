# SmartEmbedModel

SmartEmbedModel is a versatile and convenient interface for utilizing various embedding models via API and locally. It provides a unified way to work with different embedding models, making it easy to switch between models or use multiple models in your projects.

## Features

- Support for multiple embedding models (local and API-based)
- Easy-to-use API for embedding text
- Batch processing capabilities with GPU acceleration
- Token counting and management
- Flexible configuration options
- Support for both local and API-based models
- WebGPU acceleration for supported models
- Iframe and Web Worker isolation options

## Installation

```bash
npm install smart-embed
```

## Quick Start

```javascript
import { SmartEmbedModel } from 'smart-embed';

// Create model instance
const embed_model = new SmartEmbedModel({
  model_key: 'TaylorAI/bge-micro-v2', // Default local model
  use_gpu: true, // Enable WebGPU acceleration if available
});

// Generate embeddings
const embeddings = await embed_model.embed("Your text here");
console.log(embeddings.vec); // Access embedding vector
console.log(embeddings.tokens); // Access token count
```

## Configuration

SmartEmbedModel can be configured with various options:

### Core Options

```javascript
const model = new SmartEmbedModel({
  // Model Selection
  model_key: 'TaylorAI/bge-micro-v2', // Model identifier
  
  // Performance Options
  use_gpu: true, // Enable WebGPU acceleration
  batch_size: 32, // Default batch size
  gpu_batch_size: 10, // Batch size when using GPU
  
  // Model Configuration
  model_config: {
    adapter: 'transformers', // Override default adapter
    dims: 384, // Override embedding dimensions
    max_tokens: 512 // Maximum tokens per input
  },
  
  // Custom Settings
  settings: {
    api_key: 'YOUR_API_KEY', // For API-based models
    min_chars: 300 // Minimum text length to embed
  }
});
```

### Adapter Types

1. **Transformers Adapter** - Local model processing
```javascript
import { SmartEmbedTransformersAdapter } from 'smart-embed-model/adapters/transformers';

const model = new SmartEmbedModel({
  model_key: 'TaylorAI/bge-micro-v2',
  adapters: {
    transformers: SmartEmbedTransformersAdapter
  }
});
```

2. **OpenAI Adapter** - API-based processing
```javascript
import { SmartEmbedOpenAIAdapter } from 'smart-embed-model/adapters/openai';

const model = new SmartEmbedModel({
  model_key: 'text-embedding-3-small',
  settings: {
    openai_api_key: 'YOUR_API_KEY'
  },
  adapters: {
    openai: SmartEmbedOpenAIAdapter
  }
});
```

3. **Iframe/Worker Adapters** - Isolated processing
```javascript
import { SmartEmbedTransformersIframeAdapter } from 'smart-embed-model/adapters/transformers_iframe';

const model = new SmartEmbedModel({
  model_key: 'TaylorAI/bge-micro-v2',
  adapters: {
    transformers_iframe: SmartEmbedTransformersIframeAdapter
  }
});
```

## Available Models

The library includes support for various models:

### Local Models
- `TaylorAI/bge-micro-v2` (Default)
- `andersonbcdefg/bge-small-4096`
- `Xenova/jina-embeddings-v2-base-zh`

### API Models
- `text-embedding-3-small`
- `text-embedding-3-large`
- `text-embedding-ada-002`

## API Reference

### Core Methods

```javascript
// Generate embeddings for single input
const result = await model.embed("Your text here");

// Process multiple inputs in batch
const results = await model.embed_batch([
  { embed_input: "First text" },
  { embed_input: "Second text" }
]);

// Count tokens in text
const tokens = await model.count_tokens("Your text here");
```

### Advanced Usage

```javascript
// GPU acceleration with custom batch size
const model = new SmartEmbedModel({
  use_gpu: true,
  gpu_batch_size: 16,
  model_config: {
    max_tokens: 1024
  }
});

// Automatic token truncation
const long_text = "...very long text...";
const result = await model.embed(long_text); // Automatically truncated if needed
```

## License

This project is licensed under the MIT License - see the [LICENSE](MIT_LICENSE) file for details.

## Author

Brian Joseph Petro (🌴 Brian)