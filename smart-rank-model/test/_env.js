import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartRankModel } from '../smart_ranker_model.js';
import { SmartEmbedTransformersAdapter } from '../adapters/transformers.js';
const __dirname = new URL('.', import.meta.url).pathname;

class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_opts() {
    return {
      env_path: __dirname,
      env_data_dir: 'test',
      smart_embed_model_class: SmartRankModel,
      smart_embed_adapters: {
        transformers: SmartEmbedTransformersAdapter,
      },
    };
  }
}
export async function load_test_env(t) {
  const main = new TestMain();
  const env = new SmartEnv(main, main.smart_env_opts);
  // await env.init();
  await env.opts.smart_embed_model_class.load(env, {
    model_key: 'TaylorAI/bge-micro-v2',
  });
  t.context.env = env;
}