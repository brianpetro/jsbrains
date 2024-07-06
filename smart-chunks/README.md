# Smart Chunks
Smart Blocks (chunks) are intelligently designed chunks used to maximize the value of inputs into embedding models.

## installation
```
npm install smart-chunks
```


## Markdown adapter
The `MarkdownAdapter` class in `markdown.js` is responsible for parsing markdown content and extracting meaningful blocks of text, which can then be used for various purposes such as embedding into models.

### Features
- **Front Matter Handling**: The adapter can process front matter blocks, which are typically used for metadata at the beginning of markdown files.
- **Duplicate Headings Handling**: It ensures that duplicate headings are managed properly to avoid conflicts.
- **Content Line Identification**: The adapter can identify and process lines that contain actual content.
- **Breadcrumbs Conversion**: Converts file paths into breadcrumb-like structures for better organization.
- **Link Extraction**: Utilizes the `extract_links` function to extract both markdown and wikilinks from the content.

### Default Options
The `MarkdownAdapter` comes with a set of default options:
- `excluded_headings`: Headings to be excluded from processing.
- `embed_input_max_chars`: Maximum number of characters for embedding input.
- `embed_input_min_chars`: Minimum number of characters for embedding input.
- `skip_blocks_with_headings_only`: Whether to skip blocks that contain only headings.
- `multi_heading_blocks`: Whether to allow multiple headings within a single block.
- `min_length_for_single_line_blocks`: Minimum length for single-line blocks.

### Usage
To use the `MarkdownAdapter`, you need to create an instance of it and call the `parse` method with the entity containing the markdown content.

### Example
```js
const { SmartChunks } = require('smart-chunks');
const smart_chunks = new SmartChunks(env, {adapter: 'markdown'});
const result = smart_chunks.parse({
  content: '# Heading 1\ntext\n## Heading 2\n[[Link 1]]',
  file_path: './path/to/file.md',
});
```

### Output
```json
{
  "blocks": [
    {
      "text": "Block 1",
      "path": "./path/to/file.md#Heading 1",
      "length": 100
    }
  ],
  "outlinks": [
    {
      "title": "Link 1",
      "target": "Link 1",
      "line": 4
    }
  ]
}
```