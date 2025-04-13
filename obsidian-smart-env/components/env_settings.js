import { ExcludedFoldersFuzzy } from '../modals/exclude_folders_fuzzy.js';
import { ExcludedSourcesModal } from '../modals/excluded_sources.js';
import { EnvStatsModal } from '../modals/env_stats.js';
import { ExcludedFilesFuzzy } from '../modals/exclude_files_fuzzy.js';
import env_settings_css from './env_settings.css' with { type: 'css' };

/**
 * Build the HTML string for environment settings
 * wrapped in .sc-env-settings-container, with a header & toggle button.
 */
export async function build_html(env, opts = {}) {
  // Build inner settings controls
  const env_settings_html = Object.entries(env.settings_config).map(([setting_key, setting_config]) => {
    if (setting_key === 'file_exclusions' || setting_key === 'folder_exclusions') return false;
    if (!setting_config.setting) setting_config.setting = setting_key;
    return this.render_setting_html(setting_config);
  }).filter(Boolean).join('\n');

  const add_excluded_folders_btn = `
    <button class="sc-add-excluded-folder-btn" type="button">Add excluded folder</button>
  `;
  const add_excluded_files_btn = `
    <button class="sc-add-excluded-file-btn" type="button">Add excluded file</button>
  `;

  const excluded_folders_list = `<div class="sc-excluded-folders-list"></div>`;
  const excluded_files_list = `<div class="sc-excluded-files-list"></div>`;

  // Outer container + heading
  // sc-env-settings-body is hidden/shown by the toggle button
  return `
    <div class="sc-env-settings-container">
      <div class="sc-env-settings-header">
        <h2>Smart Environment</h2>
        <button type="button" class="toggle-env-settings-btn">Show environment settings</button>
      </div>
      <div class="sc-env-settings-body" style="display: none;">
        <div class="smart-env-settings-header" id="smart-env-buttons">
          <button class="sc-collection-stats-btn" type="button">Show stats</button>
          <button class="smart-env_reload-sources-btn" type="button">Reload sources</button>
          <button class="smart-env_clean-up-data-btn" type="button">Clean-up data</button>
          <button class="smart-env_clear-sources-data-btn" type="button">Clear sources data</button>
        </div>

        ${env_settings_html}

        <div class="smart-env-settings-header">
          <h2>Excluded folders</h2>
          ${add_excluded_folders_btn}
        </div>
        ${excluded_folders_list}

        <div class="smart-env-settings-header">
          <h2>Excluded files</h2>
          ${add_excluded_files_btn}
        </div>
        ${excluded_files_list}

        <button class="sc-excluded-sources-btn" type="button">Show excluded</button>

        <div data-smart-settings="smart_sources"></div>
        <div data-smart-settings="smart_blocks"></div>
        <p>Notes about embedding models:</p>
        <ul>
          <li>IMPORTANT: make sure local <code>BGE-micro-v2</code> embedding model works before trying other local models.</li>
          <li>API models require an API key and send your notes to third-party servers for processing.</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * Render environment settings as a DocumentFragment
 */
export async function render(env, opts = {}) {
  const html = await build_html.call(this, env, opts);
  const frag = this.create_doc_fragment(html);
  this.apply_style_sheet(env_settings_css);

  // Wire up the dynamic components
  await this.render_setting_components(frag, { scope: env });

  // The main container and the body to toggle
  env.settings_container = frag.querySelector('.sc-env-settings-container');

  // Post-process the references
  post_process.call(this, env, env.settings_container, opts);

  return frag;
}

/**
 * Sets up event listeners for toggling, fuzzy modals, re-rendering exclusion lists, etc.
 */
export async function post_process(env, container, opts = {}) {
  const heading_btn = container.querySelector('.toggle-env-settings-btn');
  const body_el = container.querySelector('.sc-env-settings-body');

  // Toggle button to show/hide sc-env-settings-body
  if (heading_btn && body_el) {
    heading_btn.addEventListener('click', () => {
      const is_hidden = (body_el.style.display === 'none');
      body_el.style.display = is_hidden ? 'block' : 'none';
      heading_btn.textContent = is_hidden ? 'Hide environment settings' : 'Show environment settings';
    });
  }

  // Excluded folders
  const add_folder_btn = container.querySelector('.sc-add-excluded-folder-btn');
  if (add_folder_btn) {
    add_folder_btn.addEventListener('click', () => {
      const fuzzy = new ExcludedFoldersFuzzy(env.main.app, env);
      fuzzy.open(() => {
        render_excluded_dir_list(env, container);
        env.update_exclusions();
      });
    });
  }

  // Excluded files
  const add_file_btn = container.querySelector('.sc-add-excluded-file-btn');
  if (add_file_btn) {
    add_file_btn.addEventListener('click', () => {
      const fuzzy = new ExcludedFilesFuzzy(env.main.app, env);
      fuzzy.open(() => {
        render_excluded_file_list(env, container);
        env.update_exclusions();
      });
    });
  }

  // Show excluded
  const show_excluded_btn = container.querySelector('.sc-excluded-sources-btn');
  if (show_excluded_btn) {
    show_excluded_btn.addEventListener('click', () => {
      const modal = new ExcludedSourcesModal(env.main.app, env);
      modal.open();
    });
  }

  // Show stats
  const show_stats_btn = container.querySelector('.sc-collection-stats-btn');
  if (show_stats_btn) {
    show_stats_btn.addEventListener('click', () => {
      const modal = new EnvStatsModal(env.main.app, env);
      modal.open();
    });
  }

  // Reload sources
  const reload_sources_btn = container.querySelector('.smart-env_reload-sources-btn');
  if (reload_sources_btn) {
    reload_sources_btn.addEventListener('click', async () => {
      const start = Date.now();
      env.smart_sources.unload();
      env.smart_blocks.unload();
      await env.init_collections();
      await env.load_collections();
      await env.smart_sources.process_embed_queue();
      const end = Date.now();
      env.main.notices?.show('reload_sources', { time_ms: end - start });
    });
  }

  // Clean-up data
  const clean_up_data_btn = container.querySelector('.smart-env_clean-up-data-btn');
  if (clean_up_data_btn) {
    clean_up_data_btn.addEventListener('click', async () => {
      await env.smart_sources.run_clean_up_data();
    });
  }

  // Clear sources data (inline confirm, no browser confirm())
  const smart_env_buttons = container.querySelector('#smart-env-buttons');
  const clear_sources_data_btn = smart_env_buttons.querySelector('.smart-env_clear-sources-data-btn');
  if (clear_sources_data_btn) {
    // Create inline confirm row
    const inline_confirm_html = `
      <div class="sc-inline-confirm-row" style="display: none;">
        <span style="margin-right: 10px;">
          Are you sure you want to clear all sources data? This cannot be undone.
        </span>
        <span class="sc-inline-confirm-row-buttons">
          <button class="sc-inline-confirm-yes">Yes</button>
          <button class="sc-inline-confirm-cancel">Cancel</button>
        </span>
      </div>
    `;
    const inline_confirm_frag = this.create_doc_fragment(inline_confirm_html);

    // Insert the confirm row after the button
    smart_env_buttons.appendChild(inline_confirm_frag);

    const confirm_yes = smart_env_buttons.querySelector('.sc-inline-confirm-yes');
    const confirm_cancel = smart_env_buttons.querySelector('.sc-inline-confirm-cancel');

    clear_sources_data_btn.addEventListener('click', () => {
      const confirm_row = smart_env_buttons.querySelector('.sc-inline-confirm-row');
      confirm_row.style.display = 'block';
      clear_sources_data_btn.style.display = 'none';
    });
    confirm_yes.addEventListener('click', async (e) => {
      const confirm_row = e.target.closest('.sc-inline-confirm-row');
      await env.smart_sources.run_clear_all();
      confirm_row.style.display = 'none';
      clear_sources_data_btn.style.display = 'inline-block';
    });
    confirm_cancel.addEventListener('click', (e) => {
      const confirm_row = e.target.closest('.sc-inline-confirm-row');
      confirm_row.style.display = 'none';
      clear_sources_data_btn.style.display = 'inline-block';
    });
  }

  // Render sub-collections if any
  const env_collections_containers = container.querySelectorAll('[data-smart-settings]');
  for (const el of env_collections_containers) {
    const collection_key = el.dataset.smartSettings;
    const collection = env[collection_key];
    if (!collection) continue;
    await collection.render_settings(el);
  }

  // Finally, render current lists
  render_excluded_dir_list(env, container);
  render_excluded_file_list(env, container);
}

/**
 * Render the list of excluded folders as <li> items with a remove button.
 */
function render_excluded_dir_list(env, container) {
  const list_container = container.querySelector('.sc-excluded-folders-list');
  if (!list_container) return;
  list_container.empty();
  const ul = list_container.createEl('ul');
  const excluded_csv = env.settings.folder_exclusions || '';
  const arr = excluded_csv.split(',').map(s => s.trim()).filter(Boolean);

  arr.forEach(folder => {
    const li = ul.createEl('li', { cls: 'excluded-folder-item' });
    li.setText(folder + '  ');
    const remove_btn = li.createEl('button', { text: '(x)', cls: 'remove-folder-btn' });
    remove_btn.addEventListener('click', () => {
      const splitted = excluded_csv.split(',').map(x => x.trim()).filter(Boolean);
      const new_arr = splitted.filter(f => f !== folder);
      env.settings.folder_exclusions = new_arr.join(',');
      render_excluded_dir_list(env, container);
    });
  });
  if (!arr.length) {
    ul.createEl('li', { text: 'No folders excluded yet.' });
  }
}

/**
 * Render the list of excluded files as <li> items with a remove button.
 */
function render_excluded_file_list(env, container) {
  const list_container = container.querySelector('.sc-excluded-files-list');
  if (!list_container) return;
  list_container.empty();
  const ul = list_container.createEl('ul');
  const excluded_csv = env.settings.file_exclusions || '';
  const arr = excluded_csv.split(',').map(s => s.trim()).filter(Boolean);

  arr.forEach(file_path => {
    const li = ul.createEl('li', { cls: 'excluded-file-item' });
    li.setText(file_path + '  ');
    const remove_btn = li.createEl('button', { text: '(x)', cls: 'remove-file-btn' });
    remove_btn.addEventListener('click', () => {
      const splitted = excluded_csv.split(',').map(s => s.trim()).filter(Boolean);
      const new_arr = splitted.filter(f => f !== file_path);
      env.settings.file_exclusions = new_arr.join(',');
      render_excluded_file_list(env, container);
    });
  });
  if (!arr.length) {
    ul.createEl('li', { text: 'No files excluded yet.' });
  }
}
