import {
  get_by_path,
  set_by_path,
  escape_html as util_escape_html,
} from 'smart-utils';

/**
 * DROPDOWN
 *
 * params:
 * - setting_key
 * - options: Array<string | { value, label, disabled? }>
 * - placeholder_option?: string
 * - default_value
 */
export function build_html(scope, params = {}) {
  const setting_key = params.setting_key;
  if (!setting_key) throw new Error('form/dropdown: params.setting_key is required');
  if (!scope) throw new Error('form/dropdown: scope is required');

  if (!scope.settings || typeof scope.settings !== 'object') scope.settings = {};
  const settings = scope.settings;

  const escape =
    this && typeof this.escape_html === 'function'
      ? this.escape_html.bind(this)
      : util_escape_html;

  const raw_value = get_by_path(settings, setting_key);
  const current_value =
    typeof raw_value === 'undefined' ? params.default_value ?? '' : raw_value;
  const current_str =
    current_value === null || typeof current_value === 'undefined'
      ? ''
      : String(current_value);

  const label_html = params.label
    ? `<div class="setting-item-name">${escape(params.label)}</div>`
    : '';

  const desc_html = params.description
    ? `<div class="setting-item-description">${escape(params.description)}</div>`
    : '';

  const tooltip_text = params.tooltip ? escape(params.tooltip) : '';
  const tooltip_attr = tooltip_text ? ` title="${tooltip_text}"` : '';

  const options = Array.isArray(params.options) ? params.options : [];
  const chunks = [];

  if (typeof params.placeholder_option === 'string') {
    chunks.push(
      `<option value="">${escape(params.placeholder_option)}</option>`
    );
  }

  if (options.length === 0) {
    chunks.push('<option value="">No options</option>');
  } else {
    options.forEach((opt) => {
      let value_raw;
      let label;
      let disabled = false;

      if (typeof opt === 'string') {
        value_raw = opt;
        label = opt;
      } else if (opt && typeof opt === 'object') {
        value_raw =
          typeof opt.value !== 'undefined' ? opt.value : opt.label ?? '';
        label =
          typeof opt.label === 'string'
            ? opt.label
            : String(value_raw ?? '');
        disabled = !!opt.disabled;
      } else {
        value_raw = '';
        label = '';
      }

      const value_str = String(value_raw ?? '');
      const selected_attr = value_str === current_str ? ' selected' : '';
      const disabled_attr = disabled ? ' disabled' : '';

      chunks.push(
        `<option value="${escape(value_str)}"${selected_attr}${disabled_attr}>${escape(
          label
        )}</option>`
      );
    });
  }

  const control_html = `<select>${chunks.join('')}</select>`;

  return `
    <div class="setting-item"${tooltip_attr}>
      <div class="info setting-item-info">
        ${label_html}
        ${desc_html}
      </div>
      <div class="control setting-item-control"${tooltip_attr}>
        ${control_html}
      </div>
    </div>
  `;
}

export async function render(scope, params = {}) {
  const html = build_html.call(this, scope, params);
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, scope, frag, params);
}

export async function post_process(scope, container, params = {}) {
  const setting_key = params.setting_key;
  if (!setting_key) return container;

  const select = container.querySelector('select');
  if (!select) return container;

  if (!scope.settings) throw new Error('form/dropdown: scope.settings is required');

  const handler = () => {
    const value = select.value;
    set_by_path(scope.settings, setting_key, value);
    if (typeof params.on_change === 'function') {
      params.on_change(value, { scope, setting_key, select, container });
    }
  };

  select.addEventListener('change', handler);

  if (
    this &&
    typeof this.attach_disposer === 'function' &&
    typeof HTMLElement !== 'undefined' &&
    select instanceof HTMLElement
  ) {
    this.attach_disposer(select, () => {
      select.removeEventListener('change', handler);
    });
  }

  return container;
}

render.version = 0.1;
