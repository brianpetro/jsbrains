import * as lucide from 'lucide-static';
export class SmartViews {
  constructor(main, opts={}) {
    this.main = main;
    // support main as Main or Env
    this.opts = {
      ...(this.main.smart_env_config || this.main.opts || {}),
      ...opts,
    };
  }
  get ejs() { return this.opts.ejs; }
  get template() { return this.opts.templates[this.opts.template_name]; }
  get templates() { return this.opts.templates; }
  render(template_name, data, opts={}) {
    const template = this.templates[template_name];
    const html = this.ejs.render(
      template,
      {
        ...this.default_template_data,
        ...data,
      },
      {
        context: this,
        ...opts
      }
    );
    if(opts.container) opts.container.innerHTML = html;
    return html;
  }
  get default_template_data() {
    return {
      include: (template_name, data, options={}) => {
        const template = this.templates[template_name];
        console.log({data});
        return this.ejs.render(template, data, options);
      }
    };
  }
  add_icon(icon_name) {
    const icon = lucide[icon_name];
    return icon;
  }
}