import test from 'ava';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { SmartChatModel } from '../../smart-chat-model/smart_chat_model.js';
import { extract_text } from '../adapters/pdf.js';
import * as pdf_lib from 'pdf-lib';
import sharp from 'sharp';

dotenv.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('extract_text with test.pdf', async t => {
  const pdf_path = path.join(__dirname, 'test.pdf');
  const base64_pdf = (await fs.readFile(pdf_path)).toString('base64');

  const env_opts = {
    chat_model: SmartChatModel,
    dependencies: {
      pdf_lib,
      sharp,
    },
    settings: {
      openai: {
        api_key: OPENAI_API_KEY,
      },
    },
  };

  const response = await extract_text(env_opts, base64_pdf);
  t.truthy(response);
  t.regex(response, /# Page \d+/);
});
