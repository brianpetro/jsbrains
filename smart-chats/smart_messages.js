import { SmartBlocks } from "smart-sources";


export class SmartMessages extends SmartBlocks {
  process_load_queue() { }
  process_import_queue() { }
  get data_folder() { return this.env.opts.env_path + (this.env.opts.env_path ? "/" : "") + "multi" + "/" + "chats"; }
  init() { }
}
