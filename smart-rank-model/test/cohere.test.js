import test from 'ava';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SmartRankModel } from '../smart_rank_model.js';
import { cohere as SmartRankCohereAdapter } from '../adapters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const api_key = process.env.COHERE_API_KEY || 'fake_cohere_api_key';

test('CohereAdapter rank function returns expected results', async t => {
  const query = "What is the capital of the United States?";
  const documents = [
    "Carson City is the capital city of the American state of Nevada.",
    "The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.",
    "Washington, D.C. (also known as simply Washington) is the capital of the United States.",
    "Capital punishment (the death penalty) has existed in the United States since before the United States was a country."
  ];

  const model = await SmartRankModel.load({
    smart_rank_adapters: {
      cohere: SmartRankCohereAdapter
    }
  }, {
    adapter: 'cohere',
  });

  const response = await model.rank(query, documents);
  t.true(Array.isArray(response), 'Response should be an array of ranked results');
  // Check if the top-ranked document is the one mentioning Washington, D.C.
  const topRankedDoc = documents[response[0].index];
  t.truthy(topRankedDoc.includes("Washington, D.C."), 'Top ranked doc should mention Washington, D.C.');
});
