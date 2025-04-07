import { Modal } from 'obsidian';

export class EnvStatsModal extends Modal {
  constructor(app, env) {
    super(app);
    this.env = env;
  }
  async onOpen() {
    this.titleEl.setText("Smart Environment");
    const frag = await this.env.render_component("env_stats", this.env);
    this.contentEl.appendChild(frag);
  }
}
