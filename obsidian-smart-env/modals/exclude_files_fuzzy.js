import { FuzzySuggestModal } from 'obsidian';

/**
 * @file exclude_files_fuzzy.js
 * @description An Obsidian FuzzySuggestModal to pick a single file from env.fs.file_paths
 * and add it to env.settings.file_exclusions (CSV).
 */

export class ExcludedFilesFuzzy extends FuzzySuggestModal {
  /**
   * @param {App} app - The Obsidian app
   * @param {Object} env - An environment-like object, must have .settings and .fs.file_paths
   */
  constructor(app, env) {
    super(app);
    this.env = env;
    this.setPlaceholder('Select a file to exclude...');
  }

  open(callback) {
    this.callback = callback;
    super.open();
  }

  getItems() {
    // Return all file paths from env.fs
    // But filter out ones already in env.settings.file_exclusions
    const fileExclusions = (this.env.settings.file_exclusions || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const candidates = (this.env.smart_sources?.fs?.file_paths || [])
      .filter(path => !fileExclusions.includes(path));

    return candidates;
  }

  getItemText(item) {
    return item; // item is the file path
  }

  onChooseItem(item) {
    if (!item) return;
    const oldVal = this.env.settings.file_exclusions || '';
    const splitted = oldVal.split(',').map(s => s.trim()).filter(Boolean);
    if (!splitted.includes(item)) splitted.push(item);
    this.env.settings.file_exclusions = splitted.join(',');
    this.callback?.();
  }
}
