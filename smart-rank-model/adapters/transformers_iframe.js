import { SmartRankIframeAdapter } from "./iframe.js";
import { transformers_connector } from "../connectors/transformers_iframe.js";

export class SmartRankTransformersIframeAdapter extends SmartRankIframeAdapter {
  constructor(smart_rank) {
    super(smart_rank);
    this.connector = transformers_connector;
  }
}