const { MarkdownAdapter } = require('./adapters/markdown');
exports.markdown = MarkdownAdapter;
exports.md = MarkdownAdapter;

const { CanvasAdapter } = require('./adapters/canvas');
exports.canvas = CanvasAdapter;

const { JavaScriptAdapter } = require('./adapters/javascript');
exports.javascript = JavaScriptAdapter;
exports.js = JavaScriptAdapter;