const test = require('ava');
const { WorkerAdapter } = require('./worker');

// Test data
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

test.beforeEach(async t => {
  t.context.workerAdapter = new WorkerAdapter({
    config: {
      worker_config: {
        adapter: 'Transformers',
        model_key: 'Xenova/bge-reranker-base',
        quantized: true
      }
    }
  });
  t.context.workerAdapter.main = {
    config: t.context.config
  };
  await t.context.workerAdapter.init();
});

test('rank function returns expected results for query 1', async t => {
  const { workerAdapter } = t.context;

  const rankedDocuments = await workerAdapter.rank(query, documents);
  console.log({ rankedDocuments });
  t.is(documents[rankedDocuments[0].corpus_id], expected_top, 'The top document should correctly identify the best organic skincare product for sensitive skin');
});

test('rank function returns expected results for query 2', async t => {
  const { workerAdapter } = t.context;

  const rankedDocuments = await workerAdapter.rank(query2, docs2);
  console.log({ rankedDocuments });
  t.is(docs2[rankedDocuments[0].corpus_id], expected_top2, 'The top document should correctly identify Washington, D.C. as the capital of the United States');
});
