import { ExcludedFoldersFuzzy } from '../modals/exclude_folders_fuzzy.js';
import { ExcludedSourcesModal } from '../modals/excluded_sources.js';
import { EnvStatsModal } from '../modals/env_stats.js';
import { ExcludedFilesFuzzy } from '../modals/exclude_files_fuzzy.js';
import env_settings_css from './env_settings.css' with { type: 'css' };

/**
 * Build the HTML string for environment settings
 */
export async function build_html(env, opts = {}) {
  const env_settings_html = Object.entries(env.settings_config).map(([setting_key, setting_config]) => {
    if (setting_key === 'file_exclusions' || setting_key === 'folder_exclusions') return false;
    if (!setting_config.setting) setting_config.setting = setting_key;
    return this.render_setting_html(setting_config);
  }).filter(Boolean).join('\n');

  // Buttons to add new folder or file
  const addExcludedFolderBtn = `
    <button class="sc-add-excluded-folder-btn" type="button">Add Excluded Folder</button>
  `;
  const addExcludedFileBtn = `
    <button class="sc-add-excluded-file-btn" type="button">Add Excluded File</button>
  `;

  // We'll show the current lists of excluded folders/files in simple blocks
  const excludedFoldersList = `
    <div class="sc-excluded-folders-list">
    </div>
  `;
  const excludedFilesList = `
    <div class="sc-excluded-files-list">
    </div>
  `;

  const html = `
    <div class="sc-env-settings-container">
      <div class="smart-env-settings-header">
        <h2>Smart Environment</h2>
        <button class="sc-collection-stats-btn" type="button">Show Stats</button>
        <button class="smart-env_reload-sources-btn" type="button">Reload Sources</button>
      </div>
      ${env_settings_html}

      <div class="smart-env-settings-header">
        <h2>Excluded Folders</h2>
        ${addExcludedFolderBtn}
      </div>
      <div>
        ${excludedFoldersList}
      </div>

      <div class="smart-env-settings-header">
        <h2>Excluded Files</h2>
        ${addExcludedFileBtn}
      </div>
      <div>
        ${excludedFilesList}
      </div>
      <button class="sc-excluded-sources-btn" type="button">Show Excluded</button>

      <div data-smart-settings="smart_sources"></div>
      <div data-smart-settings="smart_blocks"></div>
    </div>
  `;
  return html;
}

/**
 * Render environment settings as DocumentFragment
 */
export async function render(env, opts = {}) {
  let html = await build_html.call(this, env, opts);
  const frag = this.create_doc_fragment(html);
  this.apply_style_sheet(env_settings_css);
  await this.render_setting_components(frag, { scope: env });
  env.settings_container = frag.querySelector('.sc-env-settings-container');
  post_process.call(this, env, env.settings_container, opts);
  return frag;
}

/**
 * In post_process, we wire up the fuzzy modals for adding exclusions
 * and re-render the existing CSV lists with remove buttons.
 */
export async function post_process(env, frag, opts = {}) {
  // 1) Add Excluded Folder button
  const addFolderBtn = frag.querySelector('.sc-add-excluded-folder-btn');
  if (addFolderBtn) {
    addFolderBtn.addEventListener('click', () => {
      const fuzzy = new ExcludedFoldersFuzzy(env.main.app, env);
      fuzzy.open(() => {
        render_excluded_dir_list(env, frag);
        env.update_exclusions(); // ensure exclusions are updated
      });
    });
  }

  // Add Excluded File button
  const addFileBtn = frag.querySelector('.sc-add-excluded-file-btn');
  if (addFileBtn) {
    addFileBtn.addEventListener('click', () => {
      const fuzzy = new ExcludedFilesFuzzy(env.main.app, env);
      fuzzy.open(() => {
        render_excluded_file_list(env, frag);
        env.update_exclusions(); // ensure exclusions are updated
      });
    });
  }

  // 3) "Show Excluded" / "Show Stats" modals
  const showExcludedBtn = frag.querySelector('.sc-excluded-sources-btn');
  if (showExcludedBtn) {
    showExcludedBtn.addEventListener('click', () => {
      const modal = new ExcludedSourcesModal(env.main.app, env);
      modal.open();
    });
  }
  const showStatsBtn = frag.querySelector('.sc-collection-stats-btn');
  if (showStatsBtn) {
    showStatsBtn.addEventListener('click', () => {
      const modal = new EnvStatsModal(env.main.app, env);
      modal.open();
    });
  }
  const reloadSourcesBtn = frag.querySelector('.smart-env_reload-sources-btn');
  if (reloadSourcesBtn) {
    reloadSourcesBtn.addEventListener('click', async () => {
      const start = Date.now();
      env.smart_sources.unload();
      env.smart_blocks.unload();
      await env.init_collections();
      await env.load_collections();
      const end = Date.now();
      env.main.notices?.show('reload_sources', { time_ms: end - start });
    });
  }

  // 4) Render sub-collections if any
  const env_collections_containers = frag.querySelectorAll('[data-smart-settings]');
  for (const env_collections_container of env_collections_containers) {
    const collection_key = env_collections_container.dataset.smartSettings;
    const collection = env[collection_key];
    if (!collection) continue;
    await collection.render_settings(env_collections_container);
  }

  // Render current lists
  render_excluded_dir_list(env, frag);
  render_excluded_file_list(env, frag);

  return frag;
}

function render_excluded_dir_list(env, frag) {
  const container = frag.querySelector('.sc-excluded-folders-list');
  if (!container) return;
  container.empty();
  const ul = container.createEl('ul');
  const excludedCSV = env.settings.folder_exclusions || '';
  const arr = excludedCSV.split(',').map(s => s.trim()).filter(Boolean);

  arr.forEach(folder => {
    const li = ul.createEl('li', { cls: 'excluded-folder-item' });
    li.setText(folder + '  ');
    const removeBtn = li.createEl('button', { text: '(x)', cls: 'remove-folder-btn' });
    removeBtn.addEventListener('click', () => {
      const splitted = excludedCSV.split(',').map(x => x.trim()).filter(Boolean);
      const newArr = splitted.filter(f => f !== folder);
      env.settings.folder_exclusions = newArr.join(',');
      render_excluded_dir_list(env, frag);
    });
  });
  if (!arr.length) {
    ul.createEl('li', { text: 'No folders excluded yet.' });
  }
}

function render_excluded_file_list(env, frag) {
  const container = frag.querySelector('.sc-excluded-files-list');
  if (!container) return;
  container.empty();
  const ul = container.createEl('ul');
  const excludedCSV = env.settings.file_exclusions || '';
  const arr = excludedCSV.split(',').map(s => s.trim()).filter(Boolean);

  arr.forEach(filePath => {
    const li = ul.createEl('li', { cls: 'excluded-file-item' });
    li.setText(filePath + '  ');
    const removeBtn = li.createEl('button', { text: '(x)', cls: 'remove-file-btn' });
    removeBtn.addEventListener('click', () => {
      const splitted = excludedCSV.split(',').map(x => x.trim()).filter(Boolean);
      const newArr = splitted.filter(f => f !== filePath);
      env.settings.file_exclusions = newArr.join(',');
      render_excluded_file_list(env, frag);
    });
  });
  if (!arr.length) {
    ul.createEl('li', { text: 'No files excluded yet.' });
  }
}
