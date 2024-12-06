import test from 'ava';
import { load_test_env } from './_env.js';
import { SmartRankModel } from '../smart_rank_model.js';
import { SmartRankTransformersAdapter } from '../adapters/transformers.js';

test.before(async t => {
  await load_test_env(t);
  // Initialize test models
  t.context.models = {};
});

const query = "Organic skincare products for sensitive skin";
const documents = [
    "Eco-friendly kitchenware for modern homes",
    "Biodegradable cleaning supplies for eco-conscious consumers",
    "Organic cotton baby clothes for sensitive skin",
    "Natural organic skincare range for sensitive skin",
    "Tech gadgets for smart homes: 2024 edition",
    "Sustainable gardening tools and compost solutions",
    "Sensitive skin-friendly facial cleansers and toners",
    "Organic food wraps and storage solutions",
    "All-natural pet food for dogs with allergies",
    "Yoga mats made from recycled materials",
];
const expected_top = "Natural organic skincare range for sensitive skin";
const query2 = "What is the capital of the United States?";
const docs2 = [
  "Carson City is the capital city of the American state of Nevada.",
  "The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.",
  "Washington, D.C. (also known as simply Washington or D.C., and officially as the District of Columbia) is the capital of the United States. It is a federal district.",
  "Capital punishment (the death penalty) has existed in the United States since before the United States was a country. As of 2017, capital punishment is legal in 30 of the 50 states."
];
const expected_top2 = "Washington, D.C. (also known as simply Washington or D.C., and officially as the District of Columbia) is the capital of the United States. It is a federal district.";

async function get_or_create_model(t, model_key, opts = {}) {
  const cache_key = `${model_key}${opts.quantized ? '_quantized' : ''}`;
  if (!t.context.models[cache_key]) {
    t.context.models[cache_key] = new SmartRankModel({
      adapters: { transformers: SmartRankTransformersAdapter },
      settings: {
        adapter: 'transformers',
        model_key,
        ...opts
      },
    });
    await t.context.models[cache_key].adapter.load();
  }
  return t.context.models[cache_key];
}

async function test_model(t, model_key, opts = {}) {
  t.timeout(30000);
  const model = await get_or_create_model(t, model_key, opts);

  // Test skincare ranking
  const response = await model.rank(query, documents, { return_documents: true, top_k: 10 });
  // console.log({response});
  t.is(documents[response[0].index], expected_top, 'The top document should correctly identify the most relevant skincare document');
  
  // Test capital city ranking
  const response2 = await model.rank(query2, docs2, { return_documents: true, top_k: 10 });
  // console.log({response2});
  t.is(docs2[response2[0].index], expected_top2, 'The top document should correctly identify Washington, D.C. as the capital');
}

// Test cases for different models
const test_cases = [
  {
    name: 'jina-reranker-v1-tiny-en',
    model_key: 'jinaai/jina-reranker-v1-tiny-en'
  },
  {
    name: 'jina-reranker-v1-turbo-en',
    model_key: 'jinaai/jina-reranker-v1-turbo-en'
  },
  {
    name: 'mxbai-rerank-xsmall-v1',
    model_key: 'mixedbread-ai/mxbai-rerank-xsmall-v1'
  },
  {
    name: 'bge-reranker-base',
    model_key: 'Xenova/bge-reranker-base',
    opts: { quantized: true }
  }
];

// Generate test cases dynamically
for (const test_case of test_cases) {
  test.serial(`${test_case.name} rank function returns expected results`, async t => {
    await test_model(t, test_case.model_key, test_case.opts || {});
  });
}

// Clean up models after all tests
test.after.always(t => {
  // Clean up any resources if needed
  t.context.models = {};
});


