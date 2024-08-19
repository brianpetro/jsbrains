import { SmartFs } from 'smart-file-system';
export class SmartEnvSettings {
  constructor(env, opts={}) {
    this.env = env;
    this.main = this.env.main;
    this.fs = new SmartFs(env, {
      adapter_class: this.main.smart_env_opts.smart_fs_adapter_class,
    });
  }
  async save(settings) {
  }
  async load() {
  }
}