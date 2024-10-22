export class SmartTemplateMarkdownAdapter {
  constructor(template) {
    this.template = template;
  }

  get file_types() { return ['md']; }
  convert_to_ejs(template) {
    return convert_to_ejs(template);
  }


  // The existing context keys
  get context_frontmatter_index() {
    // Start with predefined keys like system_prompt and tags_as_context
    let index = ['tags_as_context', 'system_prompt'];
    return index;
  }

  async get_template() {
    const full_content = await this.template.read();
    const template_opts = this.parse_frontmatter(full_content) || {};
    
    // Strip frontmatter context config
    const template = await this.strip_frontmatter_context_config(full_content);
    
    return { template, template_opts };
  }

  parse_frontmatter(content) {
    // const match = content.match(/^---\s*\n([\s\S]+?)\n\s*---/);
    const match = content.match(/^---\s*([\s\S]+?)\s*---/);

    if (match) {
      const frontmatter = match[1];
      const yaml_object = {};
      const lines = frontmatter.split('\n');
      for (const line of lines) {
        const trimmed_line = line.trim();
        if (trimmed_line && !trimmed_line.startsWith('#')) {
          const colon_index = trimmed_line.indexOf(':');
          if (colon_index !== -1) {
            const key = trimmed_line.slice(0, colon_index).trim();
            const value = trimmed_line.slice(colon_index + 1).trim();
            if (value.startsWith('"') && value.endsWith('"')) {
              yaml_object[key] = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
              yaml_object[key] = value.slice(1, -1);
            } else if (value.toLowerCase() === 'true') {
              yaml_object[key] = true;
            } else if (value.toLowerCase() === 'false') {
              yaml_object[key] = false;
            } else if (!isNaN(Number(value))) {
              yaml_object[key] = Number(value);
            } else {
              yaml_object[key] = value;
            }
          }
        }
      }
      return yaml_object;
    }
    return null;
  }

  async parse_variables() {
    const {template, template_opts} = await this.get_template();
    const variables = [];
    const regex = /{{\s*([^}]+)\s*}}/gi;
    const matches = template.match(regex);
    var i = 1;
    matches?.forEach((match, index) => {
      if (match.includes('"')) {
        variables.push({
          name: `var_${i++}`,
          prompt: match.replace(/{{\s*"([^"]+)"\s*}}/g, '$1').trim(),
          type: 'string',
          inline: true
        });
      } else {
        let name = match.replace(/{{\s*=?\s*([\w\s.-]+(\[\])?)\s*}}/g, '$1').trim();
        let isArray = false;
        if (name.endsWith('[]')) {
          isArray = true;
          name = name.slice(0, -2); // Handle array variables
        }

        const prompt_key = name.replace(/[-\s]/g, '_'); // Replace hyphens and spaces with underscores
        const prompt = (
          template_opts[prompt_key] // from frontmatter (precedence)
          || this.template.env.smart_templates.var_prompts[prompt_key]?.prompt // from var_prompts settings
          || name + ' prompt' // fallback
        ).trim();

        variables.push({ 
          name: prompt_key, 
          prompt, 
          inline: false,
          type: isArray ? 'array' : 'string',  // Mark as array if detected
        });
      }
    });

    this._parsed_variables = variables;  // Store parsed variables for later use
    return variables;
  }

  async strip_frontmatter_context_config(template_content) {
    const index = this.context_frontmatter_index.concat((this._parsed_variables || []).map(v => v.name));
    const regex_pattern = index.map(tag => `^${tag}:.*\\n`).join('|');
    const dynamic_regex = new RegExp(regex_pattern, 'gm');

    return template_content
      .replace(dynamic_regex, '')  // Remove the specified context frontmatter keys
      .replace(/^---\n---/gm, '');  // Remove any remaining frontmatter markers
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
  content = content.replace(/{{\s*([\w\s-]+)(\[\])?\s*}}/g, (match, p1) => `<%- ${p1.trim().replace(/[\s-]+/g, '_')} %>`);
  return content;
}
