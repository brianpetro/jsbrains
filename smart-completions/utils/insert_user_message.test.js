import test from 'ava';
import { insert_user_message } from './insert_user_message.js';

// Test inserting a user message into an empty request
test('insert_user_message - empty request', t => {
  const request = {};
  const user_message = 'Hello, world!';
  
  insert_user_message(request, user_message);
  
  t.deepEqual(request.messages, [
    {
      role: 'user',
      content: [{ type: 'text', text: 'Hello, world!' }]
    }
  ]);
});

// Test inserting a user message at the end (default)
test('insert_user_message - append to existing message', t => {
  const request = {
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Initial message' }]
      }
    ]
  };
  const user_message = 'Additional message';
  
  insert_user_message(request, user_message);
  
  t.deepEqual(request.messages, [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Initial message' },
        { type: 'text', text: 'Additional message' }
      ]
    }
  ]);
});

// Test inserting a user message at the start
test('insert_user_message - prepend to existing message', t => {
  const request = {
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Initial message' }]
      }
    ]
  };
  const user_message = 'Prepended message';
  
  insert_user_message(request, user_message, { position: 'start' });
  
  t.deepEqual(request.messages, [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Prepended message' },
        { type: 'text', text: 'Initial message' }
      ]
    }
  ]);
});

// Test with string content that needs to be converted to array
test('insert_user_message - convert string content to array', t => {
  const request = {
    messages: [
      {
        role: 'user',
        content: 'String content'
      }
    ]
  };
  const user_message = 'New message';
  
  insert_user_message(request, user_message);
  
  t.deepEqual(request.messages, [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'String content' },
        { type: 'text', text: 'New message' }
      ]
    }
  ]);
});

// Test with empty user message (should not modify request)
test('insert_user_message - empty user message', t => {
  const request = {
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Original message' }]
      }
    ]
  };
  
  insert_user_message(request, '');
  
  t.deepEqual(request.messages, [
    {
      role: 'user',
      content: [{ type: 'text', text: 'Original message' }]
    }
  ]);
});

// Test with mixed message types
test('insert_user_message - with assistant messages present', t => {
  const request = {
    messages: [
      {
        role: 'system',
        content: 'System prompt'
      },
      {
        role: 'user',
        content: 'User question'
      },
      {
        role: 'assistant',
        content: 'Assistant response'
      }
    ]
  };
  const user_message = 'Follow-up question';
  
  insert_user_message(request, user_message);
  
  t.deepEqual(request.messages, [
    {
      role: 'system',
      content: 'System prompt'
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'User question' },
        { type: 'text', text: 'Follow-up question' }
      ]
    },
    {
      role: 'assistant',
      content: 'Assistant response'
    }
  ]);
}); 