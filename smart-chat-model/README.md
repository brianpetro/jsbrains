# Smart Chat Model

A universal chat model API client that supports a wide variety of providers and models. 

Supports using OpenAI formatted requests for any provider.

## Important Nomenclature

### `defaults` -> `settings` -> `opts` -> `config`

- `defaults` are default values (static)
- `settings` are persisted values (dynamic)
- `opts` are passed to the model class constructor
- `config` contains the above values merged such that `opts` override `settings` and `settings` override `defaults`

`config` type getters should be the preferred way to access values.

### `adapter` vs `model`

- `adapter` refers to the adapter class
- `model` refers to the specific model used by the adapter