import { SmartEmbedIframeAdapter } from "./iframe.js";
import { transformers_connector } from "../connectors/transformers_iframe.js";

export class SmartEmbedTransformersIframeAdapter extends SmartEmbedIframeAdapter {
  constructor(smart_embed) {
    super(smart_embed);
    this.connector = transformers_connector;
  }
}