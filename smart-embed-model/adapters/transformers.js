import { SmartEmbedAdapter } from "./_adapter.js";

export class SmartEmbedTransformersAdapter extends SmartEmbedAdapter {
  constructor(model) {
    super(model);
    this.pipeline = null;
    this.tokenizer = null;
  }

  async load() {
    await this.load_transformers();
    this.loaded = true;
  }
  async unload() {
    if (this.pipeline) {
      if (this.pipeline.destroy) await this.pipeline.destroy();
      this.pipeline = null;
    }
    if (this.tokenizer) {
      this.tokenizer = null;
    }
    this.loaded = false;
  }
  async load_transformers() {
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

    this.pipeline = await pipeline('feature-extraction', this.model_key, pipeline_opts);
    this.tokenizer = await AutoTokenizer.from_pretrained(this.model_key);
  }

  async count_tokens(input) {
    if (!this.tokenizer) await this.load();
    const { input_ids } = await this.tokenizer(input);
    return { tokens: input_ids.data.length };
  }

  async embed_batch(inputs) {
    if (!this.pipeline) await this.load();
    const filtered_inputs = inputs.filter(item => item.embed_input?.length > 0);
    if (!filtered_inputs.length) return [];

    if (filtered_inputs.length > this.batch_size) {
      console.log(`Processing ${filtered_inputs.length} inputs in batches of ${this.batch_size}`);
      const results = [];
      for (let i = 0; i < filtered_inputs.length; i += this.batch_size) {
        const batch = filtered_inputs.slice(i, i + this.batch_size);
        const batch_results = await this._process_batch(batch);
        results.push(...batch_results);
      }
      return results;
    }

    return await this._process_batch(filtered_inputs);
  }

  async _process_batch(batch_inputs) {
    const tokens = await Promise.all(batch_inputs.map(item => this.count_tokens(item.embed_input)));
    const embed_inputs = await Promise.all(batch_inputs.map(async (item, i) => {
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
      const resp = await this.pipeline(embed_inputs, { pooling: 'mean', normalize: true });

      return batch_inputs.map((item, i) => {
        item.vec = Array.from(resp[i].data).map(val => Math.round(val * 1e8) / 1e8);
        item.tokens = tokens[i].tokens;
        return item;
      });
    } catch (err) {
      console.error("error_processing_batch", err);
      return Promise.all(batch_inputs.map(async (item) => {
        try {
          const result = await this.pipeline(item.embed_input, { pooling: 'mean', normalize: true });
          item.vec = Array.from(result[0].data).map(val => Math.round(val * 1e8) / 1e8);
          item.tokens = (await this.count_tokens(item.embed_input)).tokens;
          return item;
        } catch (single_err) {
          console.error("error_processing_single_item", single_err);
          return {
            ...item,
            vec: [],
            tokens: 0,
            error: single_err.message
          };
        }
      }));
    }
  }

  get settings_config() {
    return transformers_settings_config;
  }
  
}
export const transformers_settings_config = {
  "[EMBED_MODEL].gpu_batch_size": {
    name: 'GPU Batch Size',
    type: "number",
    description: "Number of embeddings to process per batch on GPU. Use 0 to disable GPU.",
    placeholder: "Enter number ex. 10",
    // callback: 'restart',
  },
  "legacy_transformers": {
    name: 'Legacy Transformers (no GPU)',
    type: "toggle",
    description: "Use legacy transformers (v2) instead of v3.",
    callback: 'embed_model_changed',
    default: true,
  },
};