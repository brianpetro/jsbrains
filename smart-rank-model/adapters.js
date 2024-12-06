import { SmartRankAdapter } from "./adapters/_adapter.js";
import { SmartRankCohereAdapter } from "./adapters/cohere.js";
import { SmartRankTransformersAdapter } from "./adapters/transformers.js";
import { SmartRankTransformersIframeAdapter } from "./adapters/transformers_iframe.js";
import { SmartRankTransformersWorkerAdapter } from "./adapters/transformers_worker.js";

export {
  SmartRankAdapter as _default,
  SmartRankCohereAdapter as cohere,
  SmartRankTransformersAdapter as transformers,
  SmartRankTransformersIframeAdapter as transformers_iframe,
  SmartRankTransformersWorkerAdapter as transformers_worker,
};
