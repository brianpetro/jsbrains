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
exports.chat_md = chat_md;
