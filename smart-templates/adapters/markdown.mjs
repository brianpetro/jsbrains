export class MarkdownAdapter {
  constructor(main) {
    this.main = main;
  }
  get file_types() { return ['md']; }
  convert_to_ejs(template) {
    return convert_to_ejs(template);
  }

}

export function convert_to_ejs(content) {
  return content.replace(/{{\s*(\w+)\s*}}/g, '<%- $1 %>');
}