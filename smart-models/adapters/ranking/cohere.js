import {
  SmartRankCohereAdapter,
} from "smart-rank-model/adapters/cohere.js";

/**
 * Wrapper adapter that integrates Cohere ranking into smart-models
 * collections/env (http adapter, settings pipeline, etc).
 */
export class CohereRankingModelAdapter extends SmartRankCohereAdapter {
  constructor(model_item) {
    super(model_item);
  }

  get http_adapter() {
    if (!this._http_adapter) {
      const HttpClass = this.model.env.config.modules.http_adapter.class;
      const http_params = {...this.model.env.config.modules.http_adapter, class: undefined};
      this._http_adapter = new HttpClass(http_params);
    }
    return this._http_adapter;
  }
  get_models () {
    return this.models;
  }
}

export const settings_config = {
  api_key: {
    name: 'Cohere API Key',
    type: "password",
    description: "Enter your Cohere API key for ranking.",
    placeholder: "Enter Cohere API Key",
  },
};


export default {
  class: CohereRankingModelAdapter,
  settings_config,
};
