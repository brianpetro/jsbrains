/**
   const tools_example = [
    {
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
    },
    {
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
  }
];
 */
/**
 * Validates a tool call against its specification to ensure all parameters are correct.
 * This function checks if all provided keys in the tool call content match the expected types,
 * handles type coercion for numeric values, validates against enums, and ensures all required
 * parameters are present.
 *
 * @param {Object} tool - The tool object containing the function specification.
 * @param {Object} tool_call_content - The actual parameters passed to the tool function.
 * @returns {boolean} - Returns true if the tool call is valid.
 * @throws {Error} - Throws an error if any validation fails.
 */
function is_valid_tool_call(tool, tool_call_content) {
  const props = tool.function.parameters.properties;
  if (typeof props !== 'undefined' && Object.keys(tool_call_content).length === 0) throw new Error(`Invalid tool call: object is empty`);
  // check if all keys are in tool spec
  Object.entries(tool_call_content).forEach(([key, value]) => {
    if (!props[key]) throw new Error(`Invalid tool call: missing key ${key} in tool spec`, props);
    if (Array.isArray(value) && props[key].type === 'array') {
      // check if all items in the array are of the same type
      const itemType = typeof value[0];
      if (!value.every(item => typeof item === itemType)) throw new Error(`Invalid tool call: array items are not of the same type`);
      // check if the array items are of the same type as the spec
      if (props[key].items.type !== itemType) throw new Error(`Invalid tool call: array items are not of the same type as the spec`);
    } else if (props[key].type !== typeof value) {
      if (props[key].type === 'number' && typeof value === 'string') {
        // check if value is a valid number
        if (isNaN(Number(value))) throw new Error(`Invalid tool call: value ${value} is not a valid number`);
        tool_call_content[key] = Number(value); // coerce to number (should mutate tool_call_content)
      } else throw new Error(`Invalid tool call: value ${value} is not of type ${props[key].type}`);
    }
    if (props[key].enum && !props[key].enum.includes(value)) throw new Error(`Invalid tool call: value ${value} is not in enum ${props[key].enum}`);
  });
  // check if all required keys are present
  tool.function.parameters.required?.forEach(key => {
    // if (!tool_call_content[key]) throw new Error(`Invalid tool call: missing required key ${key}`);
    if (typeof tool_call_content[key] === 'undefined') throw new Error(`Invalid tool call: missing required key ${key}`);
    if (tool_call_content[key] === '') console.warn(`Empty value for required key ${key}`);
  });
  return true;
}
exports.is_valid_tool_call = is_valid_tool_call;
