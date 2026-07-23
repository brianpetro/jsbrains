export function get_scope_env(scope) {
  if (!scope || typeof scope !== 'object') {
    throw new TypeError('Action scope must be an object.');
  }

  const env = 'env' in scope
    ? scope.env
    : scope;

  if (!env || typeof env !== 'object' || !env.config?.actions) {
    throw new TypeError(
      'Action scope must be a SmartEnv or expose one through scope.env.',
    );
  }

  return env;
}

/**
 * @param {object} scope
 * @param {string} action_key
 * @param {object} [params]
 * @param {{event_source?: string}} [options]
 * @returns {*}
 */
export function run_action_entry(
  scope,
  action_key,
  params = {},
  {
    event_source,
  } = {},
) {
  if (typeof action_key !== 'string' || !action_key.trim()) {
    throw new TypeError('Action key must be a non-empty string.');
  }
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new TypeError('Action params must be an object.');
  }

  const env = get_scope_env(scope);
  const action_entry = env.config.actions[action_key];
  if (!action_entry) {
    throw new Error(`Action not found: ${action_key}`);
  }

  const scoped_action = scope.actions?.[action_key];
  const action = typeof scoped_action === 'function'
    ? scoped_action
    : typeof action_entry.action === 'function'
      ? action_entry.action.bind(scope)
      : null
  ;

  if (!action) {
    throw new Error(`Action is not callable: ${action_key}`);
  }

  const action_params = {
    ...params,
    ...(event_source === undefined
      ? {}
      : { event_source }),
  };

  return action(action_params);
}
