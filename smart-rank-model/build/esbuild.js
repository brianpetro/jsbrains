import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function build_transformers_iframe_connector() {
  try {
    const result = await esbuild.build({
      entryPoints: [join(__dirname, 'transformers_iframe_script.js')],
      bundle: true,
      format: 'esm',
      target: 'es2020',
      outfile: join(__dirname, '../connectors/transformers_iframe.js'),
      write: false,
      external: ['@huggingface/transformers'],
    });

    const outputContent = result.outputFiles[0].text;
    const wrappedContent = `export const transformers_connector = ${JSON.stringify(outputContent)};`
      .replace('@huggingface/transformers', 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.0')
      // escape ${}
      // .replace(/\$\{([\w.]+)\}/g, '\\`+$1+\\`')
    ;

    writeFileSync(join(__dirname, '../connectors/transformers_iframe.js'), wrappedContent);
    console.log('Build transformers_iframe_connector completed successfully.');
  } catch (error) {
    console.error('Build transformers_iframe_connector failed:', error);
  }
}

async function build_transformers_worker_connector() {
  try {
    const result = await esbuild.build({
      entryPoints: [join(__dirname, 'transformers_worker_script.js')],
      bundle: true,
      format: 'esm',
      target: 'es2020',
      outfile: join(__dirname, '../connectors/transformers_worker.js'),
      write: false,
      external: ['@huggingface/transformers'],
    });

    const connector = result.outputFiles[0].text
      .replace('@huggingface/transformers', 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.0')
    ;
    writeFileSync(join(__dirname, '../connectors/transformers_worker.js'), connector);
    console.log('Build transformers_worker_connector completed successfully.');
  } catch (error) {
    console.error('Build transformers_worker_connector failed:', error);
  }
}

(async () => {
  await build_transformers_iframe_connector();
  await build_transformers_worker_connector();
})();
