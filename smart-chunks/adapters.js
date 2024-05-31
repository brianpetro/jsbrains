const { MarkdownAdapter } = require('./adapters/markdown');
exports.markdown = MarkdownAdapter;
exports.md = MarkdownAdapter;

const { CanvasAdapter } = require('./adapters/canvas');
exports.canvas = CanvasAdapter;
