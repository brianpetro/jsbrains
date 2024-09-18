import { SmartEmbedAdapter } from "./_adapter.js";

export class SmartEmbedTransformersAdapter extends SmartEmbedAdapter {
  constructor(smart_embed) {
    super(smart_embed);
    this.model_key = this.smart_embed.model_key;
    this.model_config = this.smart_embed.model_config;
    this.model = null;
    this.tokenizer = null;
  }

  get batch_size() {
    return this.smart_embed.batch_size;
  }

  get max_tokens() {
    return this.smart_embed.max_tokens;
  }

  get use_gpu() {
    return this.smart_embed.opts.use_gpu || false;
  }

  async load() {
    const { pipeline, env, AutoTokenizer } = await import('@xenova/transformers');

    env.allowLocalModels = false;
    const pipeline_opts = {
      quantized: true,
    };

    if (this.use_gpu) {
      console.log("[Transformers] Using GPU");
      pipeline_opts.device = 'webgpu';
      pipeline_opts.dtype = 'fp32';
    } else {
      console.log("[Transformers] Using CPU");
      env.backends.onnx.wasm.numThreads = 8;
    }

    this.model = await pipeline('feature-extraction', this.model_key, pipeline_opts);
    this.tokenizer = await AutoTokenizer.from_pretrained(this.model_key);
  }

  async count_tokens(input) {
    if (!this.tokenizer) await this.load();
    const { input_ids } = await this.tokenizer(input);
    return { tokens: input_ids.data.length };
  }

  async embed_batch(inputs) {
    if (!this.model) await this.load();
    const filtered_inputs = inputs.filter(item => item.embed_input?.length > 0);
    if (!filtered_inputs.length) return [];

    if (filtered_inputs.length > this.batch_size) {
      throw new Error(`Input size (${filtered_inputs.length}) exceeds maximum batch size (${this.batch_size})`);
    }

    const tokens = await Promise.all(filtered_inputs.map(item => this.count_tokens(item.embed_input)));
    const embed_inputs = await Promise.all(filtered_inputs.map(async (item, i) => {
      if (tokens[i].tokens < this.max_tokens) return item.embed_input;
      let token_ct = tokens[i].tokens;
      let truncated_input = item.embed_input;
      while (token_ct > this.max_tokens) {
        const pct = this.max_tokens / token_ct;
        const max_chars = Math.floor(truncated_input.length * pct * 0.90);
        truncated_input = truncated_input.substring(0, max_chars) + "...";
        token_ct = (await this.count_tokens(truncated_input)).tokens;
      }
      tokens[i].tokens = token_ct;
      return truncated_input;
    }));

    try {
      const resp = await this.model(embed_inputs, { pooling: 'mean', normalize: true });

      return filtered_inputs.map((item, i) => {
        item.vec = Array.from(resp[i].data).map(val => Math.round(val * 1e8) / 1e8);
        item.tokens = tokens[i].tokens;
        return item;
      });
    } catch (err) {
      console.error("error_embedding_batch", err);
      return Promise.all(filtered_inputs.map(item => this.embed(item.embed_input)));
    }
  }
}