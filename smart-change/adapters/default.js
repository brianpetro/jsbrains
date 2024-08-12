export class DefaultAdapter {
  before(change_type, change_opts) {
    const { explanation = '', ...other_opts } = change_opts;

    if (change_type === 'content') {
      const { before, after } = other_opts;
      let content = `<<<<<<< HEAD\n${before}\n=======\n${after}\n>>>>>>> AI_SUGGESTION`;
      if (explanation) {
        content += `\n--- Explanation ---\n${explanation}\n-------------------\n`;
      }
      return content;
    } else if (change_type === 'location') {
      const { to_key, from_key } = other_opts;
      return {
        to_content: `<<<<<<< HEAD\n[Content moved from: ${from_key}]\n=======\n[New content]\n>>>>>>> AI_SUGGESTION`,
        from_content: `<<<<<<< HEAD\n[Original content]\n=======\n[Content moved to: ${to_key}]\n>>>>>>> AI_SUGGESTION`
      };
    }
    throw new Error(`Unsupported change type: ${change_type}`);
  }

  after(change_type, change_opts) {
    if (change_type === 'location') {
      const { from_key } = change_opts;
      return `<<<<<<< HEAD\n[Original content]\n=======\n[Content moved to: ${from_key}]\n>>>>>>> AI_SUGGESTION`;
    }
    return null;
  }
}