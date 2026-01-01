/**
 * Convert an OpenAPI spec to an array of OpenAI tool definitions.
 * Only a minimal subset of the spec is used.
 *
 * @param {object} openapi_spec
 * @returns {Array<object>}
 */
export function convert_openapi_to_tools(openapi_spec) {
  const tools = [];
  for (const path in openapi_spec.paths || {}) {
    const methods = openapi_spec.paths[path];
    for (const method in methods) {
      const endpoint = methods[method];
      const parameters = endpoint.parameters || [];
      const requestBody = endpoint.requestBody;
      const properties = {};
      const required = [];
      parameters.forEach(param => {
        properties[param.name] = {
          type: param.schema?.type,
          description: param.description || ''
        };
        if (param.required) required.push(param.name);
      });
      if (requestBody) {
        const schema = requestBody.content?.['application/json']?.schema || {};
        Object.assign(properties, schema.properties);
        if (schema.required) required.push(...schema.required);
      }
      tools.push({
        type: 'function',
        function: {
          name: endpoint.operationId || `${method}_${path.replace(/\//g, '_').replace(/[{}]/g, '')}`,
          description: endpoint.summary || endpoint.description || '',
          parameters: {
            type: 'object',
            properties,
            required
          }
        }
      });
    }
  }
  return tools;
}
