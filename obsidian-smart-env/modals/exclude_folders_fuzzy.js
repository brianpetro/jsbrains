/**
 * @file excluded_folders_fuzzy.js
 * @description An Obsidian FuzzySuggestModal to pick a single folder from env.fs.folder_paths and add it to env.settings.folder_exclusions (CSV).
 */
import { FuzzySuggestModal } from 'obsidian';

export class ExcludedFoldersFuzzy extends FuzzySuggestModal {
  /**
   * @param {App} app - The Obsidian app
   * @param {Object} env - An environment-like object, must have .settings and .fs.folder_paths
   */
  constructor(app, env) {
    super(app);
    this.env = env;
    this.setPlaceholder('Select a folder to exclude...');
  }

  open(callback) {
    this.callback = callback;
    super.open();
  }

  getItems() {
    // Return all folder paths from env.fs
    return this.env.smart_sources?.fs?.folder_paths || [];
  }

  getItemText(item) {
    return item; // item is the folder path
  }

  onChooseItem(item) {
    if (!item) return;
    // If empty, set it to item. Otherwise, CSV append.
    const oldVal = this.env.settings.folder_exclusions || '';
    const splitted = oldVal.split(',').map(s => s.trim()).filter(Boolean);
    if (!splitted.includes(item)) splitted.push(item);
    this.env.settings.folder_exclusions = splitted.join(',');
    
    this.callback?.();
  }
}