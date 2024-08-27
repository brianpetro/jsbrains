export class MarkdownSmartTemplateAdapter {
  constructor(template) {
    this.template = template;
  }
  get file_types() { return ['md']; }
  convert_to_ejs(template) {
    return convert_to_ejs(template);
  }
  get context_frontmatter_index() {
    return ['tags_as_context', 'system_prompt']
  }

  async get_template() {
    const full_content = await this.template.read();
    const frontmatter = this.parse_frontmatter(full_content);
    const template_opts = {};
    
    // Extract predefined properties from frontmatter
    for (const key of this.context_frontmatter_index) {
      if (frontmatter && frontmatter[key]) {
        template_opts[key] = frontmatter[key];
      }
    }
    
    // Strip frontmatter context config
    const template = this.strip_frontmatter_context_config(full_content);
    
    return { template, template_opts };
  }

  parse_frontmatter(content) {
    const match = content.match(/^---\n([\s\S]+?)\n---/);
    if (match) {
      const frontmatter = match[1];
      const yaml_object = {};
      const lines = frontmatter.split('\n');
      for (const line of lines) {
        const [key, ...value_parts] = line.split(':');
        if (key && value_parts.length > 0) {
          const value = value_parts.join(':').trim();
          yaml_object[key.trim()] = value;
        }
      }
      return yaml_object;
    }
    return null;
  }

  strip_frontmatter_context_config(template_content) {
    const regex_pattern = this.context_frontmatter_index
      .map(tag => `^${tag}:.*\\n`)
      .join('|');
    const dynamic_regex = new RegExp(regex_pattern, 'gm');

    return template_content
      // dynamically remove lines starting with context frontmatter tags
      .replace(dynamic_regex, '')
      // remove --- delimiters if no frontmatter is present
      .replace(/^---\n---/gm, '')
    ;
  }

  async parse_variables() {
    const template = await this.template.read();
    const variables = [];
    const regex = /{{\s*([^}]+)\s*}}/gi;
    const matches = template.match(regex);
    var i = 1;
    matches?.forEach((match, index) => {
      if (match.includes('"')) {
        variables.push({
          name: `var_${i++}`,
          prompt: match.replace(/{{\s*"([^"]+)"\s*}}/g, '$1').trim(),
          inline: true
        });
      } else {
        let name = match.replace(/{{\s*=?\s*([\w\s.-]+(\[\w+])?)\s*}}/g, '$1').trim();
        const prompt_key = name.replace(/[-\s]/g, '_'); // Replace hyphens and spaces with underscores
        const prompt = (this.template.env.smart_templates.var_prompts[prompt_key]?.prompt || name + ' prompt').trim();
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