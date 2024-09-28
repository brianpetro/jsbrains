export const transformers_connector = "// ../smart-model/smart_model.js\nvar SmartModel = class {\n  constructor(opts = {}) {\n    this.opts = opts;\n  }\n  get settings_config() {\n    return this.process_settings_config({\n      // SETTINGS GO HERE\n    });\n  }\n  process_settings_config(_settings_config, prefix = null) {\n    return Object.entries(_settings_config).reduce((acc, [key, val]) => {\n      if (val.conditional) {\n        if (!val.conditional(this)) return acc;\n        delete val.conditional;\n      }\n      const new_key = (prefix ? prefix + \".\" : \"\") + this.process_setting_key(key);\n      acc[new_key] = val;\n      return acc;\n    }, {});\n  }\n  process_setting_key(key) {\n    return key;\n  }\n  // override in sub-class if needed for prefixes and variable replacements\n};\n\n// models.json\nvar models_default = {\n  \"TaylorAI/bge-micro-v2\": {\n    id: \"TaylorAI/bge-micro-v2\",\n    batch_size: 1,\n    dims: 384,\n    max_tokens: 512,\n    name: \"BGE-micro-v2\",\n    description: \"Local, 512 tokens, 384 dim\",\n    adapter: \"transformers\"\n  },\n  \"andersonbcdefg/bge-small-4096\": {\n    id: \"andersonbcdefg/bge-small-4096\",\n    batch_size: 1,\n    dims: 384,\n    max_tokens: 4096,\n    name: \"BGE-small-4K\",\n    description: \"Local, 4,096 tokens, 384 dim\",\n    adapter: \"transformers\"\n  },\n  \"Xenova/jina-embeddings-v2-base-zh\": {\n    id: \"Xenova/jina-embeddings-v2-base-zh\",\n    batch_size: 1,\n    dims: 512,\n    max_tokens: 8192,\n    name: \"Jina-v2-base-zh-8K\",\n    description: \"Local, 8,192 tokens, 512 dim, Chinese/English bilingual\",\n    adapter: \"transformers\"\n  },\n  \"text-embedding-3-small\": {\n    id: \"text-embedding-3-small\",\n    batch_size: 50,\n    dims: 1536,\n    max_tokens: 8191,\n    name: \"OpenAI Text-3 Small\",\n    description: \"API, 8,191 tokens, 1,536 dim\",\n    endpoint: \"https://api.openai.com/v1/embeddings\",\n    adapter: \"openai\"\n  },\n  \"text-embedding-3-large\": {\n    id: \"text-embedding-3-large\",\n    batch_size: 50,\n    dims: 3072,\n    max_tokens: 8191,\n    name: \"OpenAI Text-3 Large\",\n    description: \"API, 8,191 tokens, 3,072 dim\",\n    endpoint: \"https://api.openai.com/v1/embeddings\",\n    adapter: \"openai\"\n  },\n  \"text-embedding-3-small-512\": {\n    id: \"text-embedding-3-small\",\n    batch_size: 50,\n    dims: 512,\n    max_tokens: 8191,\n    name: \"OpenAI Text-3 Small - 512\",\n    description: \"API, 8,191 tokens, 512 dim\",\n    endpoint: \"https://api.openai.com/v1/embeddings\",\n    adapter: \"openai\"\n  },\n  \"text-embedding-3-large-256\": {\n    id: \"text-embedding-3-large\",\n    batch_size: 50,\n    dims: 256,\n    max_tokens: 8191,\n    name: \"OpenAI Text-3 Large - 256\",\n    description: \"API, 8,191 tokens, 256 dim\",\n    endpoint: \"https://api.openai.com/v1/embeddings\",\n    adapter: \"openai\"\n  },\n  \"text-embedding-ada-002\": {\n    id: \"text-embedding-ada-002\",\n    batch_size: 50,\n    dims: 1536,\n    max_tokens: 8191,\n    name: \"OpenAI Ada\",\n    description: \"API, 8,191 tokens, 1,536 dim\",\n    endpoint: \"https://api.openai.com/v1/embeddings\",\n    adapter: \"openai\"\n  },\n  \"Xenova/jina-embeddings-v2-small-en\": {\n    id: \"Xenova/jina-embeddings-v2-small-en\",\n    batch_size: 1,\n    dims: 512,\n    max_tokens: 8192,\n    name: \"Jina-v2-small-en\",\n    description: \"Local, 8,192 tokens, 512 dim\",\n    adapter: \"transformers\"\n  },\n  \"nomic-ai/nomic-embed-text-v1.5\": {\n    id: \"nomic-ai/nomic-embed-text-v1.5\",\n    batch_size: 1,\n    dims: 256,\n    max_tokens: 8192,\n    name: \"Nomic-embed-text-v1.5\",\n    description: \"Local, 8,192 tokens, 256 dim\",\n    adapter: \"transformers\"\n  },\n  \"Xenova/bge-small-en-v1.5\": {\n    id: \"Xenova/bge-small-en-v1.5\",\n    batch_size: 1,\n    dims: 384,\n    max_tokens: 512,\n    name: \"BGE-small\",\n    description: \"Local, 512 tokens, 384 dim\",\n    adapter: \"transformers\"\n  },\n  \"nomic-ai/nomic-embed-text-v1\": {\n    id: \"nomic-ai/nomic-embed-text-v1\",\n    batch_size: 1,\n    dims: 768,\n    max_tokens: 2048,\n    name: \"Nomic-embed-text\",\n    description: \"Local, 2,048 tokens, 768 dim\",\n    adapter: \"transformers\"\n  }\n};\n\n// smart_embed_model.js\nvar SmartEmbedModel = class extends SmartModel {\n  /**\n   * Create a SmartEmbed instance.\n   * @param {string} env - The environment to use.\n   * @param {object} opts - Full model configuration object or at least a model_key and adapter\n   */\n  constructor(env, opts = {}) {\n    super(opts);\n    if (this.opts.model_key === \"None\") return console.log(`Smart Embed Model: No active embedding model for ${this.collection_key}, skipping embedding`);\n    this.env = env;\n    this.opts = {\n      ...this.env.opts.modules.smart_embed_model?.class ? { ...this.env.opts.modules.smart_embed_model, class: null } : {},\n      ...models_default[opts.model_key],\n      // ewww gross\n      ...opts\n    };\n    if (!this.opts.adapter) return console.warn(\"SmartEmbedModel adapter not set\");\n    if (!this.opts.adapters[this.opts.adapter]) return console.warn(`SmartEmbedModel adapter ${this.opts.adapter} not found`);\n    this.opts.use_gpu = !!navigator.gpu && this.opts.gpu_batch_size !== 0;\n    if (this.opts.adapter === \"transformers\" && this.opts.use_gpu) this.opts.batch_size = this.opts.gpu_batch_size || 10;\n  }\n  get adapters() {\n    return this.opts.adapters || this.env.opts.modules.smart_embed_model.adapters;\n  }\n  get adapter() {\n    if (!this._adapter) this._adapter = new this.adapters[this.opts.adapter](this);\n    return this._adapter;\n  }\n  async load() {\n    this.loading = true;\n    await this.adapter.load();\n    this.loading = false;\n    this.loaded = true;\n  }\n  async unload() {\n    await this.adapter.unload();\n  }\n  /**\n   * Count the number of tokens in the input string.\n   * @param {string} input - The input string to process.\n   * @returns {Promise<number>} A promise that resolves with the number of tokens.\n   */\n  async count_tokens(input) {\n    return this.adapter.count_tokens(input);\n  }\n  /**\n   * Embed the input into a numerical array.\n   * @param {string|Object} input - The input to embed. Can be a string or an object with an \"embed_input\" property.\n   * @returns {Promise<Object>} A promise that resolves with an object containing the embedding vector at `vec` and the number of tokens at `tokens`.\n   */\n  async embed(input) {\n    if (typeof input === \"string\") input = { embed_input: input };\n    return (await this.embed_batch([input]))[0];\n  }\n  /**\n   * Embed a batch of inputs into arrays of numerical arrays.\n   * @param {Array<string|Object>} inputs - The array of inputs to embed. Each input can be a string or an object with an \"embed_input\" property.\n   * @returns {Promise<Array<Object>>} A promise that resolves with an array of objects containing `vec` and `tokens` properties.\n   */\n  async embed_batch(inputs) {\n    return await this.adapter.embed_batch(inputs);\n  }\n  get model_config() {\n    return models_default[this.opts.model_key];\n  }\n  get batch_size() {\n    return this.opts.batch_size || 1;\n  }\n  get max_tokens() {\n    return this.opts.max_tokens || 512;\n  }\n  get dims() {\n    return this.opts.dims;\n  }\n  // TODO: replace static opts with dynamic reference to canonical settings via opts.settings (like smart-chat-model-v2)\n  get settings() {\n    return this.opts.settings;\n  }\n  // ref to canonical settings\n  get settings_config() {\n    return this.process_settings_config(settings_config, \"embed_model\");\n  }\n  process_setting_key(key) {\n    return key.replace(/\\[EMBED_MODEL\\]/g, this.opts.model_key);\n  }\n  get_embedding_model_options() {\n    return Object.entries(models_default).map(([key, model2]) => ({ value: key, name: key }));\n  }\n  get_block_embedding_model_options() {\n    const options = this.get_embedding_model_options();\n    options.unshift({ value: \"None\", name: \"None\" });\n    return options;\n  }\n};\nvar settings_config = {\n  model_key: {\n    name: \"Embedding Model\",\n    type: \"dropdown\",\n    description: \"Select an embedding model.\",\n    options_callback: \"embed_model.get_embedding_model_options\",\n    callback: \"embed_model_changed\",\n    default: \"TaylorAI/bge-micro-v2\"\n    // required: true\n  },\n  \"[EMBED_MODEL].min_chars\": {\n    name: \"Minimum Embedding Length\",\n    type: \"number\",\n    description: \"Minimum length of note to embed.\",\n    placeholder: \"Enter number ex. 300\"\n    // callback: 'refresh_embeddings',\n    // required: true,\n  },\n  \"[EMBED_MODEL].api_key\": {\n    name: \"OpenAI API Key for embeddings\",\n    type: \"password\",\n    description: \"Required for OpenAI embedding models\",\n    placeholder: \"Enter OpenAI API Key\",\n    // callback: 'test_api_key_openai_embeddings',\n    // callback: 'restart', // TODO: should be replaced with better unload/reload of smart_embed\n    conditional: (_this) => !_this.settings.model_key?.includes(\"/\")\n  },\n  \"[EMBED_MODEL].gpu_batch_size\": {\n    name: \"GPU Batch Size\",\n    type: \"number\",\n    description: \"Number of embeddings to process per batch on GPU. Use 0 to disable GPU.\",\n    placeholder: \"Enter number ex. 10\"\n    // callback: 'restart',\n  },\n  \"legacy_transformers\": {\n    name: \"Legacy Transformers (no GPU)\",\n    type: \"toggle\",\n    description: \"Use legacy transformers (v2) instead of v3.\",\n    callback: \"embed_model_changed\"\n  }\n};\n\n// adapters/_adapter.js\nvar SmartEmbedAdapter = class {\n  constructor(smart_embed) {\n    this.smart_embed = smart_embed;\n  }\n  async load() {\n    throw new Error(\"Not implemented\");\n  }\n  async count_tokens(input) {\n    throw new Error(\"Not implemented\");\n  }\n  async embed(input) {\n    throw new Error(\"Not implemented\");\n  }\n  async embed_batch(input) {\n    throw new Error(\"Not implemented\");\n  }\n};\n\n// adapters/transformers.js\nvar SmartEmbedTransformersAdapter = class extends SmartEmbedAdapter {\n  constructor(smart_embed) {\n    super(smart_embed);\n    this.model = null;\n    this.tokenizer = null;\n  }\n  get batch_size() {\n    if (this.use_gpu && this.smart_embed.opts.gpu_batch_size) return this.smart_embed.opts.gpu_batch_size;\n    return this.smart_embed.opts.batch_size || 1;\n  }\n  get max_tokens() {\n    return this.smart_embed.opts.max_tokens || 512;\n  }\n  get use_gpu() {\n    return this.smart_embed.opts.use_gpu || false;\n  }\n  async load() {\n    const { pipeline, env, AutoTokenizer } = await import(\"@xenova/transformers\");\n    env.allowLocalModels = false;\n    const pipeline_opts = {\n      quantized: true\n    };\n    if (this.use_gpu) {\n      console.log(\"[Transformers] Using GPU\");\n      pipeline_opts.device = \"webgpu\";\n      pipeline_opts.dtype = \"fp32\";\n    } else {\n      console.log(\"[Transformers] Using CPU\");\n      env.backends.onnx.wasm.numThreads = 8;\n    }\n    this.model = await pipeline(\"feature-extraction\", this.smart_embed.opts.model_key, pipeline_opts);\n    this.tokenizer = await AutoTokenizer.from_pretrained(this.smart_embed.opts.model_key);\n  }\n  async count_tokens(input) {\n    if (!this.tokenizer) await this.load();\n    const { input_ids } = await this.tokenizer(input);\n    return { tokens: input_ids.data.length };\n  }\n  async embed_batch(inputs) {\n    if (!this.model) await this.load();\n    const filtered_inputs = inputs.filter((item) => item.embed_input?.length > 0);\n    if (!filtered_inputs.length) return [];\n    if (filtered_inputs.length > this.batch_size) {\n      throw new Error(`Input size (${filtered_inputs.length}) exceeds maximum batch size (${this.batch_size})`);\n    }\n    const tokens = await Promise.all(filtered_inputs.map((item) => this.count_tokens(item.embed_input)));\n    const embed_inputs = await Promise.all(filtered_inputs.map(async (item, i) => {\n      if (tokens[i].tokens < this.max_tokens) return item.embed_input;\n      let token_ct = tokens[i].tokens;\n      let truncated_input = item.embed_input;\n      while (token_ct > this.max_tokens) {\n        const pct = this.max_tokens / token_ct;\n        const max_chars = Math.floor(truncated_input.length * pct * 0.9);\n        truncated_input = truncated_input.substring(0, max_chars) + \"...\";\n        token_ct = (await this.count_tokens(truncated_input)).tokens;\n      }\n      tokens[i].tokens = token_ct;\n      return truncated_input;\n    }));\n    try {\n      const resp = await this.model(embed_inputs, { pooling: \"mean\", normalize: true });\n      return filtered_inputs.map((item, i) => {\n        item.vec = Array.from(resp[i].data).map((val) => Math.round(val * 1e8) / 1e8);\n        item.tokens = tokens[i].tokens;\n        return item;\n      });\n    } catch (err) {\n      console.error(\"error_embedding_batch\", err);\n      return Promise.all(filtered_inputs.map((item) => this.embed(item.embed_input)));\n    }\n  }\n  async unload() {\n    await this.model.dispose();\n  }\n};\n\n// build/transformers_iframe_script.js\nvar model = null;\nvar smart_env = {\n  smart_embed_active_models: {},\n  opts: {\n    modules: {\n      smart_embed_model: {\n        adapters: {\n          transformers: SmartEmbedTransformersAdapter\n        }\n      }\n    }\n  }\n};\nasync function processMessage(data) {\n  const { method, params, id, iframe_id } = data;\n  try {\n    let result;\n    switch (method) {\n      case \"init\":\n        console.log(\"init\");\n        break;\n      case \"load\":\n        console.log(\"load\", params);\n        model = new SmartEmbedModel(smart_env, { ...params, adapters: { transformers: SmartEmbedTransformersAdapter }, adapter: \"transformers\" });\n        await model.load();\n        result = { model_loaded: true };\n        break;\n      case \"embed_batch\":\n        if (!model) throw new Error(\"Model not loaded\");\n        result = await model.embed_batch(params.inputs);\n        break;\n      case \"count_tokens\":\n        if (!model) throw new Error(\"Model not loaded\");\n        result = await model.count_tokens(params);\n        break;\n      case \"unload\":\n        await model.unload();\n        result = { unloaded: true };\n        break;\n      default:\n        throw new Error(`Unknown method: ${method}`);\n    }\n    return { id, result, iframe_id };\n  } catch (error) {\n    console.error(\"Error processing message:\", error);\n    return { id, error: error.message, iframe_id };\n  }\n}\nprocessMessage({ method: \"init\" });\n";