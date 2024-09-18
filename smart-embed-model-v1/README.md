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

SmartEmbedModel can be configured with various options:

- `embed_model_key`: The key of the embedding model to use (defined in `models.json`)
- `adapter`: The adapter to use for the chosen model
- `batch_size`: The number of inputs to process in a single batch
- `max_tokens`: The maximum number of tokens the model can handle
- `use_gpu`: Whether to use GPU acceleration (if available)
- `gpu_batch_size`: The batch size to use when GPU acceleration is enabled

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

- OpenAI
- Transformers
- TransformersIframe
- TransformersWorker

## License

This project is licensed under the MIT License - see the [LICENSE](MIT_LICENSE) file for details.

## Author

Brian Joseph Petro (🌴 Brian)