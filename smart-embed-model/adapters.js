const { ApiAdapter } = require('./adapters/api');
exports.api = ApiAdapter;
const { LocalApiAdapter } = require('./adapters/local_api');
exports.local_api = LocalApiAdapter;
const { TransformersAdapter } = require('./adapters/transformers');
exports.transformers = TransformersAdapter;
const { IframeAdapter } = require('./adapters/iframe');
exports.iframe = IframeAdapter;