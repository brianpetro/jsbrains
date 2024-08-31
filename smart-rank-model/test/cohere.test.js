import test from 'ava';
import { CohereAdapter } from './cohere.js';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: path.join(__dirname, '..', '..', '.env') });

// Ensure that the API key and other necessary environment variables are set
const api_key = process.env.COHERE_API_KEY;
const model_name = 'rerank-english-v2.0';
const endpoint = "https://api.cohere.ai/v1/rerank";

test('CohereAdapter rank function returns expected results', async t => {
  const adapter = new CohereAdapter({config: {api_key, model_name, endpoint}});
  const query = "What is the capital of the United States?";
  const documents = [
    "Carson City is the capital city of the American state of Nevada.",
    "The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.",
    "Washington, D.C. (also known as simply Washington or D.C., and officially as the District of Columbia) is the capital of the United States. It is a federal district.",
    "Capital punishment (the death penalty) has existed in the United States since before the United States was a country. As of 2017, capital punishment is legal in 30 of the 50 states."
  ];

  const response = await adapter.rank(query, documents);
  console.log(response);
  // console.log({resp: response}); // Optionally log the response for debugging

  t.is(documents[response.results[0].index], "Washington, D.C. (also known as simply Washington or D.C., and officially as the District of Columbia) is the capital of the United States. It is a federal district.", 'The top document should correctly identify Washington, D.C. as the capital');
});

