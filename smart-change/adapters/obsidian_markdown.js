import { SmartChangeDefaultAdapter } from './default.js';

export class SmartChangeObsidianMarkdownAdapter extends SmartChangeDefaultAdapter {
  wrap(change_type, change_opts) {
    let content = super.wrap(change_type, change_opts);
    content = content.replace('<<<<<<< HEAD', '<<<<<<< ORIGINAL');
    content = this.escape_nested_code_blocks(content);
    return `\n\`\`\`smart-change\n${content}\n\`\`\`\n`;
  }

  unwrap(content) {
    const smart_change_regex = /```smart-change\n([\s\S]*?)\n```/g;
    const matches = content.match(smart_change_regex);

    if (!matches) {
      return { before: content, after: content };
    }

    let unwrapped_content = content;
    let after_content = content;

    for (const match of matches) {
      const inner_content = match.replace(/```smart-change\n/, '').replace(/\n```$/, '').replace("ORIGINAL", "HEAD");
      const unescaped_content = this.unescape_nested_code_blocks(inner_content);
      const { before, after } = super.unwrap(unescaped_content);
      unwrapped_content = unwrapped_content.replace(match, before);
      after_content = after_content.replace(match, after);
    }

    return {
      before: unwrapped_content.trim(),
      after: after_content.trim()
    };
  }

  escape_nested_code_blocks(content) {
    return content.replace(/```/g, '\\`\\`\\`');
  }

  unescape_nested_code_blocks(content) {
    return content.replace(/\\`\\`\\`/g, '```');
  }
}