import { SmartRankAdapter } from "./adapters/_adapter.js";
import { SmartRankTransformersAdapter } from "./adapters/transformers.js";
import { SmartRankTransformersIframeAdapter } from "./adapters/transformers_iframe.js";

export {
  SmartRankAdapter as _default,
  SmartRankCohereAdapter as cohere,
  SmartRankTransformersAdapter as transformers,
  SmartRankTransformersIframeAdapter as transformers_iframe,
};