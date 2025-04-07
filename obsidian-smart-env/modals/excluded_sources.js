/**
 * @module excluded_sources_modal
 * @description A modal listing all sources that are excluded based on user settings
 */

import { Modal } from 'obsidian';

/**
 * @class ExcludedSourcesModal
 */
export class ExcludedSourcesModal extends Modal {
  /**
   * @param {Object} app - Obsidian app
   * @param {Object} env - The environment instance
   */
  constructor(app, env) {
    super(app);
    this.env = env;
  }

  async onOpen() {
    this.titleEl.setText('Excluded Sources');

    // await this.env.smart_sources.fs.init();

    this.contentEl.addClass('excluded-sources-modal');
    this.render_excluded_list();
  }

  async render_excluded_list() {
    this.contentEl.empty();
    const list_el = this.contentEl.createEl('ul');

    // const file_exclusions = (this.env.settings.file_exclusions || '')
    //   .split(',')
    //   .map(s => s.trim())
    //   .filter(Boolean);

    // const folder_exclusions = (this.env.settings.folder_exclusions || '')
    //   .split(',')
    //   .map(s => s.trim())
    //   .filter(Boolean);

    // We'll gather from env.smart_sources => check if path is excluded
    // const all_sources = Object.values(this.env.smart_sources?.items || {});
    // for (const source of all_sources) {
    //   const path = source.path || '';
    //   // naive check: if any folderExclusions is a prefix of path, or path includes fileExclusions
    //   if (
    //     folder_exclusions.some(fe => path.startsWith(fe)) ||
    //     file_exclusions.some(e => path.includes(e))
    //   ) {
    //     const li = list_el.createEl('li');
    //     li.setText(path);
    //   }
    // }
    const excluded_file_paths = this.env.smart_sources.excluded_file_paths;
    console.log(excluded_file_paths);
    for (const file_path of excluded_file_paths) {
      const li = list_el.createEl('li');
      li.setText(file_path);
    }
  }
}
