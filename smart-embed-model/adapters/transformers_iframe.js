import { SmartEmbedIframeAdapter } from "./iframe.js";
import { transformers_connector } from "../connectors/transformers_iframe.js";
import { transformers_settings_config } from "./transformers.js";
export class SmartEmbedTransformersIframeAdapter extends SmartEmbedIframeAdapter {
  constructor(model) {
    super(model);
    this.connector = transformers_connector;
    if(this.settings.legacy_transformers || !this.use_gpu){
      this.connector = this.connector
        .replace('@xenova/transformers', 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2')
      ;
      this.use_gpu = false;
    }
    else this.connector = this.connector
      .replace('@xenova/transformers', 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.1')
    ;
  }

  get settings_config() {
    return transformers_settings_config;
  }
}