const fs = require('fs');
const esbuild = require('esbuild');
const web_connector = {};
(async () => {
  const smart_embed_transformers_web_adapter = await esbuild.build({
    entryPoints: ['smart_embed_web.js'],
    format: 'cjs',
    // format: 'esm',
    bundle: true,
    write: false,
    sourcemap: 'inline',
    target: "es2018",
    logLevel: "info",
    treeShaking: true,
    platform: 'browser',
    external: [
      'crypto',
      '@xenova/transformers',
    ],
  });
  web_connector['script'] = smart_embed_transformers_web_adapter.outputFiles[0].text;
  fs.writeFileSync('web_connector.json', JSON.stringify(web_connector, null, 2));
  console.log('Compiled web_connector.json');
})();