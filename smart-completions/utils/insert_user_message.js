/**
 * Inserts a user message into a completion request's messages array
 * @param {Object} request - The completion request object
 * @param {string} user_message - The user message to insert
 * @param {Object} opts - Options for insertion
 * @param {string} opts.position - Position to insert the message ('start' or 'end', default: 'end')
 * @deprecated This is a confusing abstraction
 * @returns {void}
 */


export function insert_user_message(request, user_message, opts = {}) {
  if (!user_message) return;
  const {position = 'end', new_user_message = false} = opts;

  if (!request.messages) {
    request.messages = [];
  }

  // Find the last user message index
  const last_user_index = request.messages.findLastIndex(x => x.role === 'user');
  
  // If there's no user message yet, add one based on position
  if ((last_user_index === -1) || new_user_message) {
    // Create a new user message object
    const new_user_message = {
      role: 'user',
      content: [{ type: 'text', text: user_message }]
    };
    request.messages.push(new_user_message);
    return;
  }

  // There is at least one user message, modify the last one
  const last_user_message = request.messages[last_user_index];
  
  // Convert content to array if it's not already
  if (!Array.isArray(last_user_message.content)) {
    last_user_message.content = [
      {
        type: 'text',
        text: last_user_message.content
      }
    ];
  }
  
  // Add the new message to the content array based on position
  if (position === 'start') {
    last_user_message.content.unshift({
      type: 'text',
      text: user_message
    });
  } else {
    last_user_message.content.push({
      type: 'text',
      text: user_message
    });
  }
}
