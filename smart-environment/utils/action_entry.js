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
 * Resolve the natural scope declared by an action entry.
 *
 * @param {object} env
 * @param {string} action_key
 * @param {object} action_entry
 * @param {object} [params]
 * @returns {object|null|undefined}
 */
export function resolve_action_scope(
  env,
  action_key,
  action_entry,
  params = {},
) {
  const action_scope = action_entry.action_scope;
  if (is_disabled(action_scope)) return env;

  validate_action_scope(action_scope, action_key);

  if (action_scope.type === 'env') return env;

  const collection = env[action_scope.collection_key];
  if (action_scope.type === 'collection') {
    return collection ?? null;
  }

  return collection?.get?.(params[action_scope.item_arg]) ?? null;
}

/**
 * Return whether a resolved scope belongs to the expected environment and is
 * compatible with the declared action scope.
 *
 * Invalid or foreign resolved scopes return false. Invalid action metadata
 * throws so the owning connector can report a configuration error.
 *
 * @param {object} env
 * @param {object|false|null|undefined} action_scope
 * @param {object|null|undefined} scope
 * @returns {boolean}
 */
export function is_action_scope_compatible(
  env,
  action_scope,
  scope,
) {
  if (!is_disabled(action_scope)) {
    validate_action_scope(action_scope);
  }
  if (!scope) return false;

  try {
    if (get_scope_env(scope) !== env) return false;
  } catch {
    return false;
  }

  if (is_disabled(action_scope)) return true;
  if (action_scope.type === 'env') return scope === env;

  const collection = env[action_scope.collection_key];
  if (!collection) return false;

  if (action_scope.type === 'collection') {
    return scope === collection;
  }

  return scope.collection === collection;
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

function validate_action_scope(action_scope, action_key = '') {
  const suffix = action_key
    ? ` for action: ${action_key}`
    : ''
  ;

  if (!action_scope || typeof action_scope !== 'object' || Array.isArray(action_scope)) {
    throw new TypeError(`Invalid action_scope${suffix}`);
  }
  if (!['env', 'collection', 'item'].includes(action_scope.type)) {
    throw new TypeError(`Invalid action_scope type${suffix}`);
  }
  if (
    action_scope.type !== 'env'
    && (
      typeof action_scope.collection_key !== 'string'
      || !action_scope.collection_key.trim()
    )
  ) {
    throw new TypeError(`Invalid action_scope collection_key${suffix}`);
  }
  if (
    action_scope.type === 'item'
    && (
      typeof action_scope.item_arg !== 'string'
      || !action_scope.item_arg.trim()
    )
  ) {
    throw new TypeError(`Invalid action_scope item_arg${suffix}`);
  }
}

function is_disabled(value) {
  return value === false
    || value === null
    || typeof value === 'undefined'
  ;
}
