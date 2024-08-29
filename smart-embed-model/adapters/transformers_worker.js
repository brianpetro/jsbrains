import { SmartEmbedWorkerAdapter } from "./worker.js";
// import { transformers_connector } from "../connectors/transformers_worker.js";

export class SmartEmbedTransformersWorkerAdapter extends SmartEmbedWorkerAdapter {
    constructor(smart_embed) {
        super(smart_embed);
        this.connector = "../connectors/transformers_worker.js";
    }
}
