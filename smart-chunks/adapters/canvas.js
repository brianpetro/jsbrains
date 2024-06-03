const { canvas_to_markdown } = require('../utils/canvas_to_markdown');
const { MarkdownAdapter } = require('./markdown');

class CanvasAdapter {
  constructor(main) {
    this.main = main;
    this.env = main.env;
    this.opts = { ...MarkdownAdapter.defaults, ...main.opts };
  }
  async parse(entity) {
    const content = await entity.get_content();
    const markdown = canvas_to_markdown(content);
    const markdown_adapter = new MarkdownAdapter(this.main);
    return await markdown_adapter.parse({content: markdown, file_path: entity.file_path});
  }
}

exports.CanvasAdapter = CanvasAdapter;