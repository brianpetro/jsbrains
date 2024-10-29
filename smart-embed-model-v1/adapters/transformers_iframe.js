import { SmartEmbedIframeAdapter } from "./iframe.js";
import { transformers_connector } from "../connectors/transformers_iframe.js";

export class SmartEmbedTransformersIframeAdapter extends SmartEmbedIframeAdapter {
  constructor(smart_embed) {
    super(smart_embed);
    this.connector = transformers_connector;
    if(this.smart_embed.settings.legacy_transformers){
      this.connector = this.connector
        .replace('@xenova/transformers', 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2')
      ;
      this.smart_embed.opts.use_gpu = false;
    }
    else this.connector = this.connector
      .replace('@xenova/transformers', 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.1')
    ;
  }
}