import { ActionCompletionAdapter, convert_openapi_to_tools } from './action.js';

/**
 * Build an XML scaffold with placeholder values and inline param descriptions.
 * @param {string} root_tag
 * @param {string} root_desc
 * @param {Object<string,{description:string}>} params
 * @returns {string}
 */
export function scaffold_xml(root_tag, root_desc, params) {
  return [
    `<${root_tag} instructions="${root_desc}">`,
    ...Object.entries(params).map(
      ([p, v]) => `  <${p} instructions="${v.description || ''}">VALUE</${p}>`
    ),
    `</${root_tag}>`
  ].join('\n');
}

/**
 * Strips all `instructions` attributes from a scaffold – used to create the
 * second (bare) template message.
 * @param {string} xml
 * @returns {string}
 */
function strip_instruction_attrs(xml) {
  return xml.replace(/\s+instructions="[^"]*"/g, '');
}

/**
 * @deprecated Use SmartActionXmlCompletionAdapter instead.
 */
export class ActionXmlCompletionAdapter extends ActionCompletionAdapter {
  static get property_name() {
    return 'action_xml_key';
  }

  /* ────────────────────────────────────────────────────────────────────────
     REQUEST CONSTRUCTION
     ────────────────────────────────────────────────────────────────────── */
  async to_request() {
    const action_key = this.data.action_xml_key;
    if (!action_key) return;

    const thread = this.item.thread;
    if (thread.current_completion !== this.item) return console.log('ActionXmlCompletionAdapter: skipping tools, not the current completion');

    /* resolve SmartAction + dynamic tool schema ------------------------- */
    const action_item = this.env.smart_actions?.get(action_key);
    if (!action_item) {
      return console.warn(`SmartAction '${action_key}' not found`);
    }

    let tools;
    try {
      const tool = action_item.as_tool;
      tools = tool ? [tool] : [];
    } catch (err) {
      return console.warn('Unable to compile OpenAPI → tools', err);
    }
    if (!tools.length) return;

    const func_def        = tools[0].function;
    const param_props     = func_def.parameters?.properties || {};
    const required_params = func_def.parameters?.required || [];

    /* stash for response stage ----------------------------------------- */
    this._func_name       = func_def.name;
    this._required_params = required_params;

    /* compose action instruction message ------------------------------- */
    const action_instruction = [
      'Important Instructions:',
      `1. You must invoke the action '${func_def.name}' exactly once.`,
      '2. You must respond *only* with XML in the exact structure provided below.',
      '3. Replace VALUE with real arguments based on the property-specific instructions below.',
      '4. Do not include any other text or instructions.',
      '5. Follow these property-specific instructions for producing the XML response.',
      'Action Instructions:',
      `- ${func_def.description || ''}`,
      'Property-Specific Instructions:',
      ...Object.entries(param_props).map(
        ([p, v]) => `- ${p}: ${v.description || ''}`
      )
    ].join('\n');

    /* compose dual XML messages ---------------------------------------- */
    const xml_scaffold = scaffold_xml(func_def.name, func_def.description, param_props);
    const xml_template = strip_instruction_attrs(xml_scaffold);

    const action_instruction_msg = [
      action_instruction,
      `You are ready to invoke the action '${func_def.name}'.`
    ].join('\n');
    const xml_template_msg = [
      `To invoke the action '${func_def.name}', respond *only* with XML in this exact structure (replace VALUE with real arguments based on the action and property-specific instructions above):`,
      xml_template
    ].join('\n');

    this.insert_user_message(action_instruction_msg);
    this.insert_user_message(xml_template_msg);

    /* mark pending action so UI can show spinner ----------------------- */
    this.data.actions ??= {};
    this.data.actions[action_key] = true;

    /* expose key for downstream convenience ---------------------------- */
    this.data.action_key = action_key; // compatibility with base adapter
  }

  /* ────────────────────────────────────────────────────────────────────────
     RESPONSE PARSING
     ────────────────────────────────────────────────────────────────────── */
  async from_response() {
    const action_key = this.data.action_xml_key;
    if (!action_key) return;

    const assistant_msg = this.response?.choices?.[0]?.message;
    if (!assistant_msg) {
      return console.warn('ActionXmlCompletionAdapter: assistant message not found');
    }

    /* ------------------------------------------------------------------
       1. obtain structured xml representation 
       ----------------------------------------------------------------- */
    const func_name = this._func_name || action_key;

    let parsed_xml = this.item?.response_structured_output;

    /* locate root matching the function name --------------------------- */
    let root_node = parsed_xml[func_name];
    if (!root_node) {
      // the model might have emitted a different-cased tag or additional wrapper
      const candidate = Object.keys(parsed_xml)[0];
      console.warn(`ActionXmlCompletionAdapter: expected root <${func_name}>, found <${candidate}> – using candidate`);
      root_node = parsed_xml[candidate];
    }
    if (!root_node) {
      return console.warn(`ActionXmlCompletionAdapter: root tag '${func_name}' not found`);
    }

    /* ------------------------------------------------------------------
       2. convert xml representation → plain js args
       ----------------------------------------------------------------- */
    const node_to_value = (node) => {
      if (!node || typeof node !== 'object') return node;

      const { attributes = {}, contents } = node;

      /* primitives / leaf -------------------------------------------- */
      if (contents === null || typeof contents !== 'object') {
        return Object.keys(attributes).length
          ? { ...attributes, value: contents }
          : contents;
      }

      /* object / nested ---------------------------------------------- */
      const out = {};
      for (const [k, v] of Object.entries(contents)) {
        out[k] = Array.isArray(v) ? v.map(node_to_value) : node_to_value(v);
      }
      return Object.keys(attributes).length ? { ...attributes, ...out } : out;
    };

    const args = node_to_value(root_node);

    /* ensure required params provided --------------------------------- */
    const missing = (this._required_params || []).filter(
      (p) => args[p] === undefined || args[p] === '' || args[p] === null
    );
    if (missing.length) {
      return console.warn(`ActionXmlCompletionAdapter: missing ${missing.join(', ')}`);
    }

    /* ------------------------------------------------------------------
       3. fabricate synthetic tool_call for superclass logic
       ----------------------------------------------------------------- */
    assistant_msg.tool_calls = [
      { function: { name: action_key, arguments: args } }
    ];
    delete assistant_msg.content; // strip xml payload

    /* ------------------------------------------------------------------
       4. delegate to ActionCompletionAdapter to run SmartAction
       ----------------------------------------------------------------- */
    await super.from_response();
  }
}
