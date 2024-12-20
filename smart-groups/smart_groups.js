import { SmartEntities } from "smart-entities";

export class SmartGroups extends SmartEntities {
  get data_dir() { return 'groups'; }

  /**
   * Introduce a group adapter to build directory structure from sources
   */
  get group_adapter() {
    if (!this._group_adapter) {
      this._group_adapter = new this.opts.group_adapter.collection(this);
    }
    return this._group_adapter;
  }

}
