export class EjsSmartTemplateAdapter {
  constructor(template) {
    this.template = template;
  }

  get file_types() { return ['ejs']; }

  async parse_variables() {
    const template_content = await this.template.read();
    const variables = [];
    const ejs_regex = /<%[-_=]?\s*=?\s*([\w.]+(\[\w+])?)\s*[-_]?%>/g;
    const curly_regex = /\{\{\s*([\w.]+(\[\w+])?)\s*(?::\s*['"]([^'"]*)['"]\s*)?\}\}/g;
    
    let match;
    let i = 1;

    while ((match = ejs_regex.exec(template_content)) !== null) {
      const variable = match[1];
      const main_variable = variable.split(/\[|\./)[0].trim();
      const prompt = this.template.env.smart_templates.var_prompts[main_variable]?.prompt || null;
      variables.push({ name: main_variable, prompt, inline: false });
    }

    return variables;
  }

  convert_to_ejs(content) {
    // EJS templates are already in EJS format, so no conversion is needed
    return content;
  }
}