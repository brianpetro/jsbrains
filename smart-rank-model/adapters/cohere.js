// curl --request POST \
//   --url https://api.cohere.ai/v1/rerank \
//   --header 'accept: application/json' \
//   --header 'content-type: application/json' \
//   --header "Authorization: bearer $CO_API_KEY" \
//   --data '{
//     "model": "rerank-english-v2.0",
//     "query": "What is the capital of the United States?",
//     "top_n": 3,
//     "documents": ["Carson City is the capital city of the American state of Nevada.",
//                   "The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.",
//                   "Washington, D.C. (also known as simply Washington or D.C., and officially as the District of Columbia) is the capital of the United States. It is a federal district.",
//                   "Capital punishment (the death penalty) has existed in the United States since beforethe United States was a country. As of 2017, capital punishment is legal in 30 of the 50 states."]
//   }'
import { SmartRankApiAdapter } from './api.js';

export class SmartRankCohereAdapter extends SmartRankApiAdapter{
  async rank(query, documents) {
    const json = await this.request({
      url: this.endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${this.api_key}`,
      },
      body: JSON.stringify({
        model: this.model_name,
        query: query,
        documents: documents,
        // top_n: 3,
      }),
    });
    // console.log({json});
    return json;
  }
}