import test from 'ava';
import { SmartEmbedModel } from '../smart_embed_model.js';
import { LmStudioEmbedModelAdapter, parse_lm_studio_models } from './lm_studio.js';
import * as adapters from '../adapters.js';

const sample_list = {
  object: 'list',
  data: [
    { id: 'model-a' },
    { id: 'model-b' }
  ]
};

test('parse_lm_studio_models normalizes list', t => {
  const parsed = parse_lm_studio_models(sample_list);
  t.deepEqual(parsed['model-a'], {
    id: 'model-a',
    model_name: 'model-a',
    dims: 768,
    max_tokens: 512,
    description: 'LM Studio model: model-a',
    adapter: 'lm_studio'
  });
});

test('LmStudioEmbedModelAdapter get_models parses response', async t => {
  class MockAdapter extends LmStudioEmbedModelAdapter {
    get http_adapter() {
      return {
        request: async () => ({ json: async () => sample_list })
      };
    }
  }
  const model = new SmartEmbedModel({
    adapters: { lm_studio: MockAdapter },
    adapter: 'lm_studio',
    settings: {}
  });
  await model.initialize();
  const models = await model.adapter.get_models(true);
  t.truthy(models['model-a']);
});

test('adapter exports include lm_studio', t => {
  t.truthy(adapters.lm_studio);
});
