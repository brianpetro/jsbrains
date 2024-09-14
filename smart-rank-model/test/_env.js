import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartRankModel } from '../smart_rank_model.js';
import { SmartRankTransformersAdapter } from '../adapters/transformers.js';
const __dirname = new URL('.', import.meta.url).pathname;

class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_config() {
    return {
      env_path: __dirname,
      env_data_dir: 'test',
      smart_rank_model_class: SmartRankModel,
      smart_rank_adapters: {
        transformers: SmartRankTransformersAdapter,
      },
    };
  }
}
export async function load_test_env(t) {
  const main = new TestMain();
  const env = new SmartEnv(main, main.smart_env_config);
  t.context.env = env;
}