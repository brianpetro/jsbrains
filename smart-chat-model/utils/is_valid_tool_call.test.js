const test = require('ava');
const { is_valid_tool_call } = require('./is_valid_tool_call');

const tool_example = {
  "type": "function",
  "function": {
    "name": "get_current_weather",
    "description": "Get the current weather in a given location",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "The city and state, e.g. San Francisco, CA",
        },
        "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
      },
      "required": ["location"],
    },
  }
};

test('valid tool call', t => {
  const tool_call_content = { location: "San Francisco, CA", unit: "celsius" };
  t.notThrows(() => is_valid_tool_call(tool_example, tool_call_content));
});

test('invalid tool call - missing required key', t => {
  const tool_call_content = { unit: "celsius" };
  t.throws(() => is_valid_tool_call(tool_example, tool_call_content), { message: /missing required key location/ });
});

test('invalid tool call - invalid enum value', t => {
  const tool_call_content = { location: "San Francisco, CA", unit: "kelvin" };
  t.throws(() => is_valid_tool_call(tool_example, tool_call_content), { message: /is not in enum/ });
});

test('invalid tool call - missing key in tool spec', t => {
  const tool_call_content = { location: "San Francisco, CA", temperature: "20" };
  t.throws(() => is_valid_tool_call(tool_example, tool_call_content), { message: /missing key temperature in tool spec/ });
});

test('invalid tool call - incorrect type', t => {
  const tool_call_content = { location: 12345, unit: "celsius" };
  t.throws(() => is_valid_tool_call(tool_example, tool_call_content), { message: /is not of type string/ });
});

/**
 * @openapi
 * /lookup:
 *   post:
 *     operationId: lookup
 *     summary: Semantic search
 *     description: Common, frequently used. Performs a semantic search of the user's data. Use to respond to 'Based on my notes...' or any other query that might require surfacing unspecified content.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hypotheticals:
 *                 type: array
 *                 description: "Short hypothetical notes predicted to be semantically similar to the notes necessary to fulfill the user's request. At least three hypotheticals per request. The hypothetical notes may contain paragraphs, lists, or checklists in markdown format. Hypothetical notes always begin with breadcrumbs containing the anticipated folder(s), file name, and relevant headings separated by ' > ' (no slashes). Example: PARENT FOLDER NAME > CHILD FOLDER NAME > FILE NAME > HEADING 1 > HEADING 2 > HEADING 3: HYPOTHETICAL NOTE CONTENTS."
 *                 items:
 *                   type: string
 * 
 */

test('should handle array as type', t => {
  const tool_call_content = { hypotheticals: ["PARENT FOLDER NAME > CHILD FOLDER NAME > FILE NAME > HEADING 1 > HEADING 2 > HEADING 3: HYPOTHETICAL NOTE CONTENTS"] };
  const tool_spec = {
    "type": "function",
    "function": {
      "name": "lookup",
      "description": "Semantic search",
      "parameters": {
        "type": "object",
        "properties": {
          "hypotheticals": {
            "type": "array",
            "items": {"type": "string"}
          }
        }
      }
    }
  };
  t.notThrows(() => is_valid_tool_call(tool_spec, tool_call_content));
});

