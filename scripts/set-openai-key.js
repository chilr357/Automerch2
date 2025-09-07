#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');

function getArg(name) {
  const p = `--${name}=`;
  const a = process.argv.find(x => x.startsWith(p));
  return a ? a.slice(p.length) : undefined;
}

const openaiKey = getArg('api-key') || process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

if (!openaiKey) {
  console.error('Missing --api-key for OpenAI');
  process.exit(1);
}

let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

function upsert(key, val) {
  const line = `${key}=${val}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) content = content.replace(re, line);
  else content += (content && !content.endsWith('\n') ? '\n' : '') + line + '\n';
}

upsert('VITE_OPENAI_API_KEY', openaiKey);
upsert('OPENAI_API_KEY', openaiKey);

fs.writeFileSync(envPath, content, 'utf8');
console.log('Updated .env.local with OpenAI API key');


