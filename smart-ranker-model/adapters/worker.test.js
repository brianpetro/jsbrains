const test = require('ava');
const { WorkerAdapter } = require('./worker');

test.beforeEach(t => {
  t.context = {
    main: {
      config: {
        worker_config: {
          adapter: 'Transformers',
          model_key: 'Xenova/bge-reranker-base',
          quantized: true
        }
      }
    }
  };
});

test.serial('WorkerAdapter initializes worker and sends config', async t => {
  const workerAdapter = new WorkerAdapter(t.context.main);
  await workerAdapter.init();

  // Mock the Worker class
  const worker = workerAdapter.worker;
  worker.postMessage = (message) => {
    t.is(message.type, 'config');
    t.deepEqual(message.config, t.context.main.config.worker_config);
  };


  await workerAdapter.rank('query', ['doc1', 'doc2']);
  t.pass();
});

test.serial('WorkerAdapter sends rank message and receives ranked documents', async t => {
  const workerAdapter = new WorkerAdapter(t.context.main);
  await workerAdapter.init();

  // Mock the Worker class
  const worker = workerAdapter.worker;
  worker.postMessage = (message) => {
    if (message.type === 'rank') {
      t.is(message.query, 'query');
      t.deepEqual(message.documents, ['doc1', 'doc2']);
    }
  };


  const ranked_documents = await workerAdapter.rank('query', ['doc1', 'doc2']);
  t.deepEqual(ranked_documents, ['doc2', 'doc1']);
});

test.serial('WorkerAdapter handles worker initialization only once', async t => {
  const workerAdapter = new WorkerAdapter(t.context.main);
  await workerAdapter.init();

  // Mock the Worker class
  const worker = workerAdapter.worker;
  let init_count = 0;
  worker.postMessage = (message) => {
    if (message.type === 'config') {
      init_count++;
    }
  };


  await workerAdapter.rank('query', ['doc1', 'doc2']);
  await workerAdapter.rank('query', ['doc1', 'doc2']);
  t.is(init_count, 1);
});

