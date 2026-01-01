import { convert_openapi_to_tools } from './openapi_to_tools.js';

/**
 * Normalize a JSON schema-like object to include defaults.
 *
 * @param {object} schema
 * @returns {object|null}
 */
function normalize_schema(schema) {
  if (!schema) return null;
  const properties = schema.properties || {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  return {
    type: schema.type || 'object',
    properties,
    required,
  };
}

/**
 * Build a descriptor object for a Smart Action module aligned to the v2 spec.
 *
 * @param {object} params
 * @param {object} params.module
 * @param {string} params.action_key
 * @returns {object}
 */
export function build_action_descriptor({ module, action_key }) {
  if (!module || typeof module !== 'object') throw new Error('Smart Action module must be an object.');
  if (!action_key) throw new Error('Smart Action module requires an action_key.');

  const description = module.description || module.tool?.function?.description || '';
  const instruction = module.instruction || '';
  const settings_config = module.settings_config || {};
  const descriptor = module.descriptor || module.mcp_descriptor || module.mcp_tool_descriptor || null;

  let input_schema = normalize_schema(module.input_schema);
  let tool = module.tool;

  if (!input_schema && module.openapi) {
    const [openapi_tool] = convert_openapi_to_tools(module.openapi);
    tool = tool || openapi_tool;
    input_schema = normalize_schema(openapi_tool?.function?.parameters);
  }

  if (!input_schema && tool?.function?.parameters) {
    input_schema = normalize_schema(tool.function.parameters);
  }

  if (!input_schema) {
    throw new Error(`Smart Action module schema is required for ${action_key}`);
  }

  const normalized_tool = tool ? {
    ...tool,
    function: {
      ...tool.function,
      name: tool.function?.name || action_key,
      description: tool.function?.description || description,
      parameters: normalize_schema(tool.function?.parameters) || input_schema,
    },
  } : {
    type: 'function',
    function: {
      name: action_key,
      description,
      parameters: input_schema,
    },
  };

  return {
    key: action_key,
    description,
    instruction,
    input_schema,
    output_schema: module.output_schema || null,
    settings_config,
    descriptor,
    tool: normalized_tool,
  };
}
