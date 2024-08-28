import { SmartEmbedIframeAdapter } from "./iframe.js";
import { transformers_connector } from "../connectors/transformers_iframe.js";

export class SmartEmbedTransformersIframeAdapter extends SmartEmbedIframeAdapter {
  constructor(smart_embed) {
    super(smart_embed);
    this.connector = transformers_connector;
    this.smart_embed.opts.use_gpu = !!navigator.gpu;
    if(this.smart_embed.opts.use_gpu) this.smart_embed.opts.batch_size = this.smart_embed.env.settings?.smart_embed?.gpu_batch_size || 50;
  }
}