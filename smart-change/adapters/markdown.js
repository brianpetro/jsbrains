import { SmartChangeDefaultAdapter } from './default.js';

export class SmartChangeMarkdownAdapter extends SmartChangeDefaultAdapter {
  before(change_type, change_opts) {
    if (change_type === 'content') {
      const { before, after, explanation } = change_opts;
      return this.format_content_change(before, after, explanation);
    } else if (change_type === 'location') {
      const { to_key, from_key, explanation } = change_opts;
      return this.format_location_change(to_key, from_key, explanation);
    }
    throw new Error(`Unsupported change type: ${change_type}`);
  }

  format_content_change(before, after, explanation) {
    const truncated_before = this.truncate_content(before);
    let result = `${before}

> [!ai_change]- AI Suggested Change
> **Original:** ${truncated_before}
> 
> **Suggested:**
> > ${after}
`;
    if (explanation) {
      result += `> 
> **Explanation:**
> > ${explanation}`;
    }
    return result;
  }

  truncate_content(content, max_length = 50) {
    if (content.length <= max_length) {
      return content;
    }

    const words = content.split(' ');
    const total_chars = words.reduce((sum, word) => sum + word.length + 1, 0) - 1;
    const chars_to_remove = total_chars - max_length + 3;

    let left_index = 0;
    let right_index = words.length - 1;
    let left_chars = 0;
    let right_chars = 0;

    while (left_index < right_index && (left_chars + right_chars) < chars_to_remove) {
      if (left_chars <= right_chars) {
        left_chars += words[left_index].length + 1;
        left_index++;
      } else {
        right_chars += words[right_index].length + 1;
        right_index--;
      }
    }

    const left_part = words.slice(0, left_index).join(' ');
    const right_part = words.slice(right_index).join(' ');

    return `${left_part}... ...${right_part}`;
  }

  format_location_change(to_key, from_key, explanation) {
    let result = `
> [!ai_move]- AI Suggested Move
> **From:** ${from_key}
> **To:** ${to_key}
`;
    if (explanation) {
      result += `> 
> **Explanation:**
> > ${explanation}`;
    }
    return result;
  }

  after(change_type, change_opts) {
    if (change_type === 'location') {
      const { from_key, to_key } = change_opts;
      return `
> [!ai_move]- Content Moved
> **Moved to:** ${to_key}
`;
    }
    return null;
  }
}