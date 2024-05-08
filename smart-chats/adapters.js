const { MarkdownAdapter } = require('./adapters/markdown');
const { CanvasAdapter } = require('./adapters/canvas');
exports.md = MarkdownAdapter;
exports.canvas = CanvasAdapter;