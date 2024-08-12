import { DefaultAdapter } from './default.js';

export class ObsidianMarkdownAdapter extends DefaultAdapter {
  before(change_type, change_opts) {
    let content = super.before(change_type, change_opts);
    content = content.replace('<<<<<<< HEAD', '<<<<<<< ORIGINAL');
    content = this.escape_nested_code_blocks(content);
    return `\n\`\`\`smart-change\n${content}\n\`\`\`\n`;
  }

  after(change_type, change_opts) {
    let content = super.after(change_type, change_opts);
    if (content) {
      content = content.replace('<<<<<<< HEAD', '<<<<<<< ORIGINAL');
      content = this.escape_nested_code_blocks(content);
      return `\n\`\`\`smart-change\n${content}\n\`\`\`\n`;
    }
    return null;
  }

  escape_nested_code_blocks(content) {
    return content.replace(/```/g, '\\`\\`\\`');
  }
}