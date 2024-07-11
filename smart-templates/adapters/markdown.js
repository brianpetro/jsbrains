export class MarkdownAdapter {
  constructor(main) {
    this.main = main;
  }
  get file_types() { return ['md']; }
  convert_to_ejs(template) {
    return convert_to_ejs(template);
  }
  async get_variables(template) {
    if (!template.includes('\n') && this.file_types.includes(template.split('.').pop())) {
      template = await this.main.load_template(template);
    }
    const variables = [];
    const regex = /{{\s*([\w\s"-]+)\s*}}/gi;
    const matches = template.match(regex);
    var i = 1;
    matches.forEach((match, index) => {
      if (match.includes('"')) {
        variables.push({ name: `var_${i++}`, prompt: match.replace(/{{\s*"([^"]+)"\s*}}/g, '$1').trim() });
      } else {
        let name = match.replace(/{{\s*=?\s*([\w\s.-]+(\[\w+])?)\s*}}/g, '$1').trim();
        const prompt_key = name.replace(/[-\s]/g, '_'); // Replace hyphens and spaces with underscores
        const prompt = (this.main.var_prompts[prompt_key]?.prompt || name + ' prompt').trim();
        variables.push({ name: prompt_key, prompt });
      }
    });
    return variables;
  }
}

export function convert_to_ejs(content) {
  // detect brackets with quotes
  const regex = /{{\s*"([^"]+)"\s*}}/g;
  const matches = content.match(regex);
  // for each match, replace with var_<match>
  matches?.forEach((match, index) => {
    content = content.replace(match, `<%- var_${index + 1} %>`);
  });
  // replace mustache syntax with EJS syntax
  content = content.replace(/{{\s*([\w\s-]+)\s*}}/g, (match, p1) => `<%- ${p1.trim().replace(/[\s-]+/g, '_')} %>`);
  return content;
}