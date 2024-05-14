const { CohereAdapter } = require('./adapters/cohere');
exports.Cohere = CohereAdapter;
const { TransformersAdapter } = require('./adapters/transformers');
exports.Transformers = TransformersAdapter;