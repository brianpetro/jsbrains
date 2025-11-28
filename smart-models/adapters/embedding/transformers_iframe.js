import {
  SmartEmbedTransformersIframeAdapter,
  settings_config
} from "smart-embed-model/adapters/transformers_iframe.js";
export class TransformersIframeEmbeddingModelAdapter extends SmartEmbedTransformersIframeAdapter {
  constructor(model_item) {
    super(model_item);
    // this.opts = model_item; // backward compatibility
  }
  get adapter_settings() {
    return this.model.settings;
  }
  get use_gpu() {
    if(this.model.settings.legacy_transformers === true) return false;
    return true;
  }
  get models () {
    return {
      "TaylorAI/bge-micro-v2": {
        "id": "TaylorAI/bge-micro-v2",
        "batch_size": 1,
        "dims": 384,
        "max_tokens": 512,
        "name": "BGE-micro-v2",
        "description": "Local, 512 tokens, 384 dim (recommended)",
        "adapter": "transformers"
      },
      "Snowflake/snowflake-arctic-embed-xs": {
        "id": "Snowflake/snowflake-arctic-embed-xs",
        "batch_size": 1,
        "dims": 384,
        "max_tokens": 512,
        "name": "Snowflake Arctic Embed XS",
        "description": "Local, 512 tokens, 384 dim",
        "adapter": "transformers"
      },
    };
  }
}
export default {
  class: TransformersIframeEmbeddingModelAdapter,
  settings_config,
};