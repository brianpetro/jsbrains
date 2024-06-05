class SmartCollectionsAdapter {
  constructor(main) {
    this.main = main;
  }
  get env() { return this.main.env; }
  get items() { return this.main.items; }

  /**
   * @returns {string} The data path for folder that contains .ajson files.
   */
  get data_path() { return this.main.data_path; }
}
exports.SmartCollectionsAdapter = SmartCollectionsAdapter;

