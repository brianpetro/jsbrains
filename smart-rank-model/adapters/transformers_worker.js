import { SmartRankWorkerAdapter } from "./worker.js";
// import { transformers_connector } from "../connectors/transformers_worker.js";

export class SmartRankTransformersWorkerAdapter extends SmartRankWorkerAdapter {
    constructor(smart_rank) {
        super(smart_rank);
        this.connector = "../connectors/transformers_worker.js";
    }
}
