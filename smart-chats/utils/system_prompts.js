export function contains_system_prompt_ref(content) {
  return content.includes("@\"");
}

export function extract_system_prompt_ref(content) {
  const mention_pattern = /@"([^"]+)"/g;
  const mentions = [];
  let match;
  let modified_content = content;

  while ((match = mention_pattern.exec(content)) !== null) {
    mentions.push(match[1]);
    modified_content = modified_content.replace(match[0], '');
  }

  modified_content = modified_content.trim();
  return { mentions, mention_pattern, content: modified_content };
}
