import esbuild from 'esbuild';

/**
 * Plugin to process CSS files imported with an import attribute:
 *   import sheet from './style.css' assert { type: 'css' };
 *
 * When such an import is detected, the plugin loads the CSS file,
 * optionally minifies it if the build options request minification,
 * and wraps the CSS text into a new CSSStyleSheet. The module then
 * exports the stylesheet as its default export.
 *
 * @deprecated Use native esbuild CSS support with "loader: { '.css': 'text' }" instead.
 * @returns {esbuild.Plugin} The esbuild plugin object.
 */

export function import_css_plugin() {
  return {
    name: 'import-css-plugin',
    setup(build) {
      // Intercept all .css files
      build.onLoad({ filter: /\.css$/ }, async (args) => {
        console.log(`import_css_plugin`, JSON.stringify(args));
        // Check for the "assert" import attribute and that its type is 'css'
        if (args.assert && args.assert.type === 'css') {
          // Read the CSS file contents
          const fs = await import('fs/promises');
          let css_content = await fs.readFile(args.path, 'utf8');

          // Optionally transform (minify) the CSS if minification is enabled
          const should_minify = build.initialOptions.minify || false;
          if (should_minify) {
            const result = await esbuild.transform(css_content, {
              loader: 'css',
              minify: true,
            });
            css_content = result.code;
          }

          // Escape any backticks in the CSS content to avoid breaking the template literal
          const escaped_css = css_content.replace(/`/g, '\\`');

          // Create a JavaScript module that creates a CSSStyleSheet and exports it
          const js_module = `
            const css_sheet = new CSSStyleSheet();
            css_sheet.replaceSync(\`${escaped_css}\`);
            export default css_sheet;
          `;

          return {
            contents: js_module,
            loader: 'js',
          };
        }
        // If the "assert" attribute is not present or not type "css",
        // return undefined so that other loaders/plugins can process it.
      });
    },
  };
}
