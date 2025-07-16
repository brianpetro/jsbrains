export class SmartActionAdapter {
  constructor(item) {
    this.item = item;
    this.module = null;
  }
  async load() {
    // added manually using imported module
  }
  /**
   * Run the loaded module’s default (or named) function with given params.
   * @param {Object} params
   * @returns {Promise<any>}
   */
  async run(params) {
    if (!this.module) {
      await this.load();
    }
    const fn = this.module.default || this.module[this.item.key];
    if (typeof fn !== 'function') {
      throw new Error(`${this.constructor.name}: No callable export found for action ${this.item.key}`);
    }
    return await fn.call(this.item, params);
  }

  /**
   * Generate an OpenAI-style tool definition for this action.
   * By default it checks `module.tool` or converts `module.openapi`.
   * @returns {object|null}
   */
  get as_tool() {
    if (!this.module) return null;
    if (this.module.tool) return this.module.tool;
    if (this.module.openapi) {
      return convert_openapi_to_tools(this.module.openapi)[0] || null;
    }
    return null;
  }
}

/**
 * Convert an OpenAPI spec to an array of OpenAI tool definitions.
 * Only a minimal subset of the spec is used.
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
          type: param.schema.type,
          description: param.description || ''
        };
        if (param.required) required.push(param.name);
      });
      if (requestBody) {
        const schema = requestBody.content['application/json'].schema;
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
