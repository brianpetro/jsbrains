const chat_ml = {
  messages: [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'system', content: '```sc-context\ntest1.md\ntest2.md\n```' },
    { role: 'user', content: 'Who am I?' },
    { role: 'user', content: 'What is 2 + 2?' },
    { role: 'assistant', tool_calls: [{ id: 'calc', type: 'function', function: { name: 'calc', arguments: '{"sum":[2,2]}' } }] },
    { role: 'tool', tool_call_id: 'calc', content: '4' },
    { role: 'assistant', content: 'The answer is 4' },
    { role: 'user', content: 'Thanks' },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: 'test1.jpg' } },
        { type: 'text', text: 'Image caption: Has a caption' },
        { type: 'image_url', image_url: { url: 'test2' } },
        { type: 'text', text: 'What are in these images? Is there any difference between them?' },
        { type: 'image_url', image_url: { url: 'with/path/test3' } },
        { type: 'text', text: 'Image caption: After the question' }
      ]
    },
    { role: 'assistant', content: 'Image caption: random caption' },
    { role: 'user', content: [
      { type: 'image_url', image_url: { url: 'image only' } }
    ]},
    { role: 'user', content: [
      { type: 'image_url', image_url: { url: 'test1.jpg' } },
      { type: 'text', text: 'Image caption: Has a caption' },
    ]},
    { role: 'user', content: "## Heading in user input" }
  ]
};
exports.chat_ml = chat_ml;

const chat_md = `
##### user
Hello

##### assistant
Hi there!

##### system
\`\`\`sc-context
test1.md
test2.md
\`\`\`

##### user
Who am I?

##### user
What is 2 + 2?

##### assistant
\`\`\`calc
{"sum":[2,2]}
\`\`\`

##### tool
\`\`\`calc
4
\`\`\`

##### assistant
The answer is 4

##### user
Thanks

##### user
![Has a caption](test1.jpg)
![](test2)
What are in these images? Is there any difference between them?
![After the question](with/path/test3)

##### assistant
Image caption: random caption

##### user
![](image only)

##### user
![Has a caption](test1.jpg)

##### user
\`\`\`md
## Heading in user input
\`\`\`
`.trim();
exports.chat_md = chat_md;

const chat_canvas = {
  "nodes": [
    {
      "id": "user-1",
      "type": "text",
      "x": 30,
      "y": 30,
      "width": 600,
      "height": 300,
      "text": "Hello"
    },
    {
      "id": "assistant-2",
      "type": "text",
      "x": 30,
      "y": 480,
      "width": 600,
      "height": 300,
      "text": "Hi there!"
    },
    {
      "id": "system-3",
      "type": "text",
      "x": 30,
      "y": 930,
      "width": 600,
      "height": 300,
      "text": "```sc-context\ntest1.md\ntest2.md\n```"
    },
    {
      "id": "user-4",
      "type": "text",
      "x": 30,
      "y": 1380,
      "width": 600,
      "height": 300,
      "text": "Who am I?"
    },
    {
      "id": "user-5",
      "type": "text",
      "x": 30,
      "y": 1830,
      "width": 600,
      "height": 300,
      "text": "What is 2 + 2?"
    },
    {
      "id": "assistant-6",
      "type": "text",
      "x": 30,
      "y": 2280,
      "width": 600,
      "height": 300,
      "text": "```calc\n{\"sum\":[2,2]}\n```"
    },
    {
      "id": "tool-7",
      "type": "text",
      "x": 30,
      "y": 2730,
      "width": 600,
      "height": 300,
      "text": "```calc\n4\n```"
    },
    {
      "id": "assistant-8",
      "type": "text",
      "x": 30,
      "y": 3180,
      "width": 600,
      "height": 300,
      "text": "The answer is 4"
    },
    {
      "id": "user-9",
      "type": "text",
      "x": 30,
      "y": 3630,
      "width": 600,
      "height": 300,
      "text": "Thanks"
    },
    {
      "id": "user-10",
      "type": "text",
      "x": 30,
      "y": 4080,
      "width": 600,
      "height": 300,
      "text": "![](test1.jpg)\nImage caption: Has a caption\n![](test2)\nWhat are in these images? Is there any difference between them?\n![](with/path/test3)\nImage caption: After the question"
    },
    {
      "id": "assistant-11",
      "type": "text",
      "x": 30,
      "y": 4530,
      "width": 600,
      "height": 300,
      "text": "Image caption: random caption"
    },
    {
      "id": "user-12",
      "type": "text",
      "x": 30,
      "y": 4980,
      "width": 600,
      "height": 300,
      "text": "![](image only)"
    },
    {
      "id": "user-13",
      "type": "text",
      "x": 30,
      "y": 5430,
      "width": 600,
      "height": 300,
      "text": "![](test1.jpg)\nImage caption: Has a caption"
    },
    {
      "id": "user-14",
      "type": "text",
      "x": 30,
      "y": 5880,
      "width": 600,
      "height": 300,
      "text": "## Heading in user input"
    }
  ],
  "edges": [
    {
      "id": "user-1-to-assistant-2",
      "fromNode": "user-1",
      "fromSide": "bottom",
      "toNode": "assistant-2",
      "toSide": "top"
    },
    {
      "id": "assistant-2-to-system-3",
      "fromNode": "assistant-2",
      "fromSide": "bottom",
      "toNode": "system-3",
      "toSide": "top"
    },
    {
      "id": "system-3-to-user-4",
      "fromNode": "system-3",
      "fromSide": "bottom",
      "toNode": "user-4",
      "toSide": "top"
    },
    {
      "id": "user-4-to-user-5",
      "fromNode": "user-4",
      "fromSide": "bottom",
      "toNode": "user-5",
      "toSide": "top"
    },
    {
      "id": "user-5-to-assistant-6",
      "fromNode": "user-5",
      "fromSide": "bottom",
      "toNode": "assistant-6",
      "toSide": "top"
    },
    {
      "id": "assistant-6-to-tool-7",
      "fromNode": "assistant-6",
      "fromSide": "bottom",
      "toNode": "tool-7",
      "toSide": "top"
    },
    {
      "id": "tool-7-to-assistant-8",
      "fromNode": "tool-7",
      "fromSide": "bottom",
      "toNode": "assistant-8",
      "toSide": "top"
    },
    {
      "id": "assistant-8-to-user-9",
      "fromNode": "assistant-8",
      "fromSide": "bottom",
      "toNode": "user-9",
      "toSide": "top"
    },
    {
      "id": "user-9-to-user-10",
      "fromNode": "user-9",
      "fromSide": "bottom",
      "toNode": "user-10",
      "toSide": "top"
    },
    {
      "id": "user-10-to-assistant-11",
      "fromNode": "user-10",
      "fromSide": "bottom",
      "toNode": "assistant-11",
      "toSide": "top"
    },
    {
      "id": "assistant-11-to-user-12",
      "fromNode": "assistant-11",
      "fromSide": "bottom",
      "toNode": "user-12",
      "toSide": "top"
    },
    {
      "id": "user-12-to-user-13",
      "fromNode": "user-12",
      "fromSide": "bottom",
      "toNode": "user-13",
      "toSide": "top"
    },
    {
      "id": "user-13-to-user-14",
      "fromNode": "user-13",
      "fromSide": "bottom",
      "toNode": "user-14",
      "toSide": "top"
    }
  ]
};
exports.chat_canvas = chat_canvas;