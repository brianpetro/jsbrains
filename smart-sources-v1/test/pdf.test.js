import test from 'ava';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SmartChatModel } from '../../smart-chat-model/smart_chat_model.js';
import { extract_text } from '../adapters/pdf.js';
import pdfjsLib from 'pdfjs-dist-legacy';
import { createCanvas } from 'canvas';

dotenv.config({ path: '../.env' });
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

import * as adapters from '../../smart-chat-model/adapters.js';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

test('extract_text with test.pdf', async t => {
  t.timeout(100000);
  const pdf_path = path.join(__dirname, 'test.pdf');
  const base64_pdf = (await fs.promises.readFile(pdf_path)).toString('base64');

  const env_opts = {
    modules: {
      smart_chat_model: {
        class: SmartChatModel,
        adapters,
      },

    },
    dependencies: {
      pdfjsLib,
      createCanvas,
    },
    settings: {
      openai: {
        api_key: OPENAI_API_KEY,
      },
    },
  };

  const response = await extract_text(env_opts, base64_pdf);
  console.log('response', response);
  // append/create a file with the response
  const output_path = path.join(__dirname, '../../../obsidian-1/+📥 inbox/pdfextract.md');
  console.log('output_path', output_path);
  // make file if not exists
  if (!fs.existsSync(output_path)) {
    await fs.promises.writeFile(output_path, '');
  }


  await fs.promises.appendFile(output_path, response);
  t.truthy(response);


  t.regex(response, /page \d+/);
});

