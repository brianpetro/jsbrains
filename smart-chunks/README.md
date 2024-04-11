# Smart Chunks
Smart Blocks (chunks) are intelligently designed chunks used to maximize the value of inputs into embedding models.

## installation
```
npm install smart-chunks
```

## usage

### SmartMarkdown

```js
const { SmartMarkdown } = require('smart-chunks');
const smart_markdown = new SmartMarkdown(optional_config);
const blocks = smart_markdown.parse({
  content: `# Heading 1\ntext\n## Heading 2\ntext`, // some markdown content
  file_path: './path/to/file.md', // optional: used to improve breadcrumbs (chunk context)
});
```

### blocks

`blocks` is an array of objects with the following properties:

- `text`: the text of the block
- `path`: the path of the block (e.g. `./path/to/file.md#heading1#heading2`)
- `length`: the length of the block in characters

## about
Designed for use with [Smart Connections](https://smartconnections.app) Obsidian plugin.
