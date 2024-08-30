# @smart-rank-model

Convenient interface for utilizing various ranking models via API and locally.

## Features

- Supports multiple ranking models
- Flexible adapter system for different model implementations
- GPU acceleration support (when available)
- Easy-to-use API for document ranking

## Configuration

The `SmartRankModel` constructor accepts two parameters:

1. `env`: The environment object containing adapter configurations
2. `opts`: Model configuration options

### Model Options

- `model_key`: Identifier for the model in the `models.json` file
- `adapter`: The adapter to use for this model
- `use_gpu`: Boolean to enable/disable GPU acceleration (auto-detected if not specified)
- `gpu_batch_size`: Batch size for GPU processing (default: 10)

## Adapters

Adapters should be implemented and added to the `env.opts.smart_rank_adapters` object. Each adapter should implement the following methods:

- `constructor(model)`: Initialize the adapter
- `load()`: Load the model
- `rank(query, documents)`: Rank the documents based on the query

## License

MIT License. See `LICENSE` file for details.