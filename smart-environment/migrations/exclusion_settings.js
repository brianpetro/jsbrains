/**
 * Moves deprecated exclusion settings at the root of the environment settings
 * into their module-specific locations.
 *
 * @param {Object} settings - SmartEnv settings object.
 * @returns {Object} updated settings reference.
 */
export function migrate_exclusion_settings_2025_08_22(settings = {}) {
  const { file_exclusions, folder_exclusions, excluded_headings } = settings;
  if (file_exclusions !== undefined || folder_exclusions !== undefined) {
    settings.smart_sources = settings.smart_sources || {};
    if (file_exclusions !== undefined) {
      settings.smart_sources.file_exclusions = file_exclusions;
      delete settings.file_exclusions;
    }
    if (folder_exclusions !== undefined) {
      settings.smart_sources.folder_exclusions = folder_exclusions;
      delete settings.folder_exclusions;
    }
  }
  if (excluded_headings !== undefined) {
    settings.smart_blocks = settings.smart_blocks || {};
    settings.smart_blocks.excluded_headings = excluded_headings;
    delete settings.excluded_headings;
  }
  return settings;
}