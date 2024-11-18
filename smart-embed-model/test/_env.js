import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartEmbedModel } from '../smart_embed_model.js';
import { SmartEmbedTransformersAdapter } from '../adapters/transformers.js';
const __dirname = new URL('.', import.meta.url).pathname;

class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_config() {
    return {
      env_path: __dirname,
      env_data_dir: 'test',
      modules: {
        smart_embed_model: {
          class: SmartEmbedModel,
          adapters: {
            transformers: SmartEmbedTransformersAdapter,
          },
        },
      },
    };
  }
}
export async function load_test_env(t) {
  const main = new TestMain();
  const env = new SmartEnv(main, main.smart_env_config);
  // await env.init();
  await env.opts.modules.smart_embed_model.class.load(env, {
    model_key: 'TaylorAI/bge-micro-v2',
    adapters: {
      transformers: SmartEmbedTransformersAdapter,
    },
  });
  t.context.env = env;
}