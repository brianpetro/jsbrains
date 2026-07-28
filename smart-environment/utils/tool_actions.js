import {
  is_action_scope_compatible,
  resolve_action_scope,
  run_action_entry,
} from './action_entry.js';

/**
 * Discover canonical tool actions from the final Smart Environment config.
 *
 * @param {object} env
 * @returns {Array<{
 *   action_key: string,
 *   action_entry: object,
 *   name: string,
 *   display_name: string,
 *   display_description: string,
 *   input_schema: object,
 *   output_schema?: object,
 *   action_scope: object,
 *   effects: object,
 * }>}
 */
export function get_tool_action_specs(env) {
  if (!env?.config?.actions) {
    throw new TypeError('Smart Environment actions are required.');
  }

  const specs = [];
  const names = new Set();

  Object.entries(env.config.actions).forEach(([action_key, action_entry]) => {
    const tool = action_entry?.tool;
    if (tool === false || tool === null || tool === undefined) return;

    // Legacy provider-shaped descriptors remain owned by their provider
    // adapter and are not part of the canonical tool-action surface.
    if (tool?.type === 'function' && tool.function) return;

    validate_tool_action_entry(action_key, action_entry);
    const name = tool.name.trim();

    if (
      typeof tool.when === 'function'
      && !tool.when({ env, action_key, action_entry })
    ) {
      return;
    }

    if (names.has(name)) {
      throw new Error(`Duplicate tool name: ${name}`);
    }
    names.add(name);

    specs.push({
      action_key,
      action_entry,
      name,
      display_name: action_entry.display_name,
      display_description: action_entry.display_description,
      input_schema: action_entry.input_schema,
      ...(action_entry.output_schema
        ? { output_schema: action_entry.output_schema }
        : {}),
      action_scope: action_entry.action_scope,
      effects: tool.effects || {},
    });
  });

  return specs.sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Validate, resolve, and run one public tool action.
 *
 * @param {object} env
 * @param {string} tool_name
 * @param {object} [params={}]
 * @param {{event_source?: string}} [options]
 * @returns {Promise<*>}
 */
export async function run_tool_action(
  env,
  tool_name,
  params = {},
  {
    event_source,
  } = {},
) {
  const name = typeof tool_name === 'string'
    ? tool_name.trim()
    : ''
  ;
  if (!name) {
    throw new TypeError('Tool name must be a non-empty string.');
  }
  if (!is_plain_object(params)) {
    throw new TypeError('Tool params must be an object.');
  }

  const spec = get_tool_action_specs(env)
    .find((candidate) => candidate.name === name)
  ;
  if (!spec) {
    throw new Error(`Tool not found or unavailable: ${name}`);
  }

  validate_schema(params, spec.input_schema, 'params', name, 'input');
  assert_json_serializable(params, 'Tool params');

  const scope = resolve_action_scope(
    env,
    spec.action_key,
    spec.action_entry,
    params,
  );
  if (!is_action_scope_compatible(env, spec.action_scope, scope)) {
    throw new Error(`Tool scope unavailable: ${name}`);
  }

  const result = await run_action_entry(
    scope,
    spec.action_key,
    params,
    {
      event_source,
    },
  );

  assert_json_serializable(result, 'Tool result');
  if (spec.output_schema) {
    validate_schema(result, spec.output_schema, 'result', name, 'output');
  }

  return result;
}

function validate_tool_action_entry(action_key, action_entry) {
  if (!is_plain_object(action_entry?.tool)) {
    throw new TypeError(`Tool action has invalid tool descriptor: ${action_key}`);
  }
  if (!to_non_empty_string(action_entry.tool.name)) {
    throw new TypeError(`Tool action is missing tool.name: ${action_key}`);
  }
  if (typeof action_entry?.action !== 'function') {
    throw new TypeError(`Tool action is not callable: ${action_key}`);
  }
  if (!to_non_empty_string(action_entry.display_name)) {
    throw new TypeError(`Tool action is missing display_name: ${action_key}`);
  }
  if (!to_non_empty_string(action_entry.display_description)) {
    throw new TypeError(`Tool action is missing display_description: ${action_key}`);
  }
  if (!is_plain_object(action_entry.input_schema)) {
    throw new TypeError(`Tool action is missing input_schema: ${action_key}`);
  }
  if (!is_plain_object(action_entry.action_scope)) {
    throw new TypeError(`Tool action is missing action_scope: ${action_key}`);
  }
  if (
    action_entry.output_schema !== undefined
    && !is_plain_object(action_entry.output_schema)
  ) {
    throw new TypeError(`Tool action has invalid output_schema: ${action_key}`);
  }
  if (
    action_entry.tool.when !== undefined
    && typeof action_entry.tool.when !== 'function'
  ) {
    throw new TypeError(`Tool action has invalid tool.when: ${action_key}`);
  }
  if (
    action_entry.tool.effects !== undefined
    && !is_plain_object(action_entry.tool.effects)
  ) {
    throw new TypeError(`Tool action has invalid tool.effects: ${action_key}`);
  }
}

function validate_schema(value, schema, path, tool_name, direction) {
  if (!is_plain_object(schema)) {
    throw new TypeError(`Invalid ${direction} schema for tool: ${tool_name}`);
  }

  const errors = [];
  collect_schema_errors(value, schema, path, errors);
  if (errors.length) {
    throw new TypeError(
      `Invalid tool ${direction} for ${tool_name}: ${errors[0]}`,
    );
  }
}

function collect_schema_errors(value, schema, path, errors) {
  if (errors.length) return;

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of: ${schema.enum.join(', ')}.`);
    return;
  }

  const allowed_types = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : []
  ;
  if (
    allowed_types.length
    && !allowed_types.some((type) => matches_schema_type(value, type))
  ) {
    errors.push(`${path} must be ${allowed_types.join(' or ')}.`);
    return;
  }

  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    if (Number.isInteger(schema.minLength) && value.length < schema.minLength) {
      errors.push(`${path} must contain at least ${schema.minLength} character(s).`);
      return;
    }
    if (Number.isInteger(schema.maxLength) && value.length > schema.maxLength) {
      errors.push(`${path} must contain at most ${schema.maxLength} character(s).`);
      return;
    }
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path} does not match the required pattern.`);
    }
    return;
  }

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push(`${path} must be at least ${schema.minimum}.`);
      return;
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push(`${path} must be at most ${schema.maximum}.`);
    }
    return;
  }

  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) {
      errors.push(`${path} must contain at least ${schema.minItems} item(s).`);
      return;
    }
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) {
      errors.push(`${path} must contain at most ${schema.maxItems} item(s).`);
      return;
    }
    if (is_plain_object(schema.items)) {
      value.forEach((item, index) => {
        collect_schema_errors(item, schema.items, `${path}[${index}]`, errors);
      });
    }
    return;
  }

  if (!is_plain_object(value)) return;

  const properties = is_plain_object(schema.properties)
    ? schema.properties
    : {}
  ;
  const required = Array.isArray(schema.required)
    ? schema.required
    : []
  ;

  required.forEach((key) => {
    if (errors.length) return;
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      errors.push(`${path}.${key} is required.`);
    }
  });

  Object.entries(value).forEach(([key, item]) => {
    if (errors.length) return;
    const property_schema = properties[key];
    if (!property_schema) {
      if (schema.additionalProperties === false) {
        errors.push(`${path}.${key} is not allowed.`);
      }
      return;
    }
    collect_schema_errors(item, property_schema, `${path}.${key}`, errors);
  });
}

function matches_schema_type(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return is_plain_object(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return Number.isFinite(value);
  return typeof value === type;
}

function assert_json_serializable(value, label) {
  const seen = new Set();

  function visit(next, path) {
    if (next === null) return;

    const type = typeof next;
    if (type === 'string' || type === 'boolean') return;
    if (type === 'number' && Number.isFinite(next)) return;
    if (
      type === 'undefined'
      || type === 'function'
      || type === 'symbol'
      || type === 'bigint'
      || type === 'number'
    ) {
      throw new TypeError(`${label} is not JSON-serializable at ${path}.`);
    }

    if (seen.has(next)) {
      throw new TypeError(`${label} is not JSON-serializable at ${path}.`);
    }
    seen.add(next);

    if (Array.isArray(next)) {
      next.forEach((item, index) => visit(item, `${path}[${index}]`));
    } else {
      Object.entries(next).forEach(([key, item]) => {
        visit(item, `${path}.${key}`);
      });
    }

    seen.delete(next);
  }

  visit(value, '$');
}

function is_plain_object(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
  ;
}

function to_non_empty_string(value) {
  return typeof value === 'string' && Boolean(value.trim());
}
