const test = require('ava');
const { SmartRankerModel } = require('../smart_ranker_model');

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

test('jina-reranker-v1-tiny-en rank function returns expected results', async t => {
  const model_key = 'jinaai/jina-reranker-v1-tiny-en';
  t.timeout(30000);
  const model = new SmartRankerModel({}, {adapter: "Transformers", model_key});
  await model.init();
  const response = await model.rank(query, documents, { return_documents: true, top_k: 3 });
  console.log({response});
  t.is(documents[response[0].corpus_id], expected_top, 'The top document should correctly identify the best strategy for sustainable agriculture');
  const response2 = await model.rank(query2, docs2, { return_documents: true, top_k: 3 });
  console.log({response2});
  t.is(docs2[response2[0].corpus_id], expected_top2, 'The top document should correctly identify Washington, D.C. as the capital');
});
test('jina-reranker-v1-turbo-en rank function returns expected results', async t => {
  const model_key = 'jinaai/jina-reranker-v1-turbo-en';
  t.timeout(30000);
  const model = new SmartRankerModel({}, {adapter: "Transformers", model_key});
  await model.init();
  const response = await model.rank(query, documents, { return_documents: true, top_k: 3 });
  console.log({response});
  t.is(documents[response[0].corpus_id], expected_top, 'The top document should correctly identify the best strategy for sustainable agriculture');
  const response2 = await model.rank(query2, docs2, { return_documents: true, top_k: 3 });
  console.log({response2});
  t.is(docs2[response2[0].corpus_id], expected_top2, 'The top document should correctly identify Washington, D.C. as the capital');
});

test('mxbai-rerank-xsmall-v1 rank function returns expected results', async t => {
  const model_key = 'mixedbread-ai/mxbai-rerank-xsmall-v1';
  t.timeout(30000);
  const model = new SmartRankerModel({}, {adapter: "Transformers", model_key});
  await model.init();
  const response = await model.rank(query, documents, { return_documents: true, top_k: 3 });
  console.log({response});
  t.is(documents[response[0].corpus_id], expected_top, 'The top document should correctly identify the best strategy for sustainable agriculture');
  const response2 = await model.rank(query2, docs2, { return_documents: true, top_k: 3 });
  console.log({response2});
  t.is(docs2[response2[0].corpus_id], expected_top2, 'The top document should correctly identify Washington, D.C. as the capital');
});

// Xenova/bge-reranker-base
test('bge-reranker-base rank function returns expected results', async t => {
  const model_key = 'Xenova/bge-reranker-base';
  t.timeout(30000);
  const model = new SmartRankerModel({}, {adapter: "Transformers", model_key, quantized: true});
  await model.init();
  const response = await model.rank(query, documents, { return_documents: true, top_k: 3 });
  console.log({response});
  t.is(documents[response[0].corpus_id], expected_top, 'The top document should correctly identify the best strategy for sustainable agriculture');
  const response2 = await model.rank(query2, docs2, { return_documents: true, top_k: 3 });
  console.log({response2});
  t.is(docs2[response2[0].corpus_id], expected_top2, 'The top document should correctly identify Washington, D.C. as the capital');
});

