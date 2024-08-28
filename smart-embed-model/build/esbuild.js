import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function build_transformers_connector() {
  try {
    const result = await esbuild.build({
      entryPoints: [join(__dirname, 'transformers_iframe_script.js')],
      bundle: true,
      format: 'esm',
      target: 'es2020',
      outfile: join(__dirname, '../connectors/transformers_iframe.js'),
      write: false,
      external: ['@xenova/transformers'],
    });

    const outputContent = result.outputFiles[0].text;
    const wrappedContent = `export const transformers_connector = ${JSON.stringify(outputContent)};`
      .replace('@xenova/transformers', 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.9')
      // escape ${}
      // .replace(/\$\{([\w.]+)\}/g, '\\`+$1+\\`')
    ;

    writeFileSync(join(__dirname, '../connectors/transformers_iframe.js'), wrappedContent);
    console.log('Build completed successfully.');
  } catch (error) {
    console.error('Build failed:', error);
  }
}

build_transformers_connector();