import { SmartEmbedWorkerAdapter } from "./worker.js";
import { transformers_settings_config } from "./transformers.js";
// import { transformers_connector } from "../connectors/transformers_worker.js";

export class SmartEmbedTransformersWorkerAdapter extends SmartEmbedWorkerAdapter {
  constructor(model) {
    super(model);
    // Create worker using a relative path
    let rel_path;
    if (import.meta.url.includes('smart-embed-model')) {
      rel_path = "../connectors/transformers_worker.js";
    } else {
      rel_path = "../node_modules/smart-embed-model/connectors/transformers_worker.js";
    }
    this.worker_url = new URL(rel_path, import.meta.url);
  }

  get settings_config() {
    return transformers_settings_config;
  }
}
