export class DefaultAdapter {
  before(change_type, change_opts) {
    const { explanation = '', ...other_opts } = change_opts;

    if (change_type === 'content') {
      const { before, after } = other_opts;
      let content = [
        `<<<<<<< HEAD`,
        before,
        `=======`,
        after,
        `>>>>>>>`,
        // `>>>>>>>`,
      ].filter(line => line).join("\n");
        
      // TODO: Decided on Explanation syntax
      // if (explanation) {
      //   content += `\n--- Explanation ---\n${explanation}\n-------------------\n`;
      // }
      return content;
    } else if (change_type === 'location') {
      const { from_key, after } = other_opts;
      return [
        `<<<<<<< MOVED_FROM`,
        from_key,
        `=======`,
        after,
        `>>>>>>>`,
      ].join("\n");
    }
    throw new Error(`Unsupported change type: ${change_type}`);
  }

  after(change_type, change_opts) {
    if (change_type === 'location') {
      const { to_key, before } = change_opts;
      return [
        `<<<<<<< HEAD`,
        before,
        `=======`,
        to_key,
        `>>>>>>> MOVED_TO`,
        before
      ].join("\n");
    }
    return null;
  }
  wrap(change_type, change_opts) {
    const { explanation = '', ...other_opts } = change_opts;
    let content = '';

    if (change_type === 'content') {
      const { before, after } = other_opts;
      content = [
        `<<<<<<< HEAD`,
        before,
        `=======`,
        after,
        `>>>>>>>`,
      ].filter(line => line).join("\n");
    } else if (change_type === 'location') {
      if (other_opts.from_key) {
        // This is the 'after' case for location change
        const { from_key, after } = other_opts;
        content = [
          `<<<<<<< MOVED_FROM`,
          from_key,
          `=======`,
          after,
          `>>>>>>>`,
        ].join("\n");
      } else if (other_opts.to_key) {
        // This is the 'before' case for location change
        const { to_key, before } = other_opts;
        content = [
          `<<<<<<< HEAD`,
          before,
          `=======`,
          to_key,
          `>>>>>>> MOVED_TO`,
          before
        ].join("\n");
      }
    } else {
      throw new Error(`Unsupported change type: ${change_type}`);
    }

    if (explanation) {
      content += `\n--- Explanation ---\n${explanation}\n-------------------\n`;
    }

    return content;
  }

  unwrap(content) {
    const lines = content.split('\n');
    let before = [];
    let after = [];
    let in_change_block = false;
    let change_type = null;
    let is_before = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('<<<<<<< HEAD') || line.startsWith('<<<<<<< MOVED_FROM')) {
        in_change_block = true;
        change_type = line.includes('MOVED_FROM') ? 'move' : 'change';
        continue;
      }

      if (line === '=======') {
        is_before = false;
        continue;
      }

      if (line.startsWith('>>>>>>>')) {
        in_change_block = false;
        change_type = null;
        is_before = true;
        continue;
      }

      if (!in_change_block) {
        before.push(line);
        after.push(line);
      } else if (change_type === 'change') {
        if (is_before) {
          before.push(line);
        } else {
          after.push(line);
        }
      } else if (change_type === 'move') {
        if (is_before) {
          // Skip the moved content in the 'before' state
        } else {
          after.push(line);
        }
      }
    }

    return {
      before: before.join('\n').trim(),
      after: after.join('\n').trim()
    };
  }
}