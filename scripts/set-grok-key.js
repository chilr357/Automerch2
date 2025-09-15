#!/usr/bin/env node

// Write VITE_GROK_API_KEY into .env.local
// Usage:
//   node scripts/set-grok-key.js --api-key=YOUR_KEY [--default]
// Or via npm:
//   npm run set:grok -- --api-key=YOUR_KEY --default

import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const envPath = path.join(cwd, '.env.local');

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

let apiKey = getArg('api-key') || process.env.VITE_GROK_API_KEY || process.env.GROK_API_KEY;
const setDefault = hasFlag('default') || process.env.SET_GROK_DEFAULT === '1';

let content = '';
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, 'utf8');
}

// Try to read existing key from .env.local if not provided
if (!apiKey) {
  const m = content.match(/^VITE_GROK_API_KEY=(.*)$/m);
  if (m && m[1]) apiKey = m[1].trim();
}

if (!apiKey) {
  console.error('Missing --api-key for Grok and no existing VITE_GROK_API_KEY found in .env.local');
  process.exit(1);
}

function upsert(key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) {
    content = content.replace(re, line);
  } else {
    if (content.length && !content.endsWith('\n')) content += '\n';
    content += `${line}\n`;
  }
}

upsert('VITE_GROK_API_KEY', apiKey);
if (setDefault) upsert('VITE_DEFAULT_AI_PROVIDER', 'grok');

fs.writeFileSync(envPath, content, 'utf8');
console.log(`Updated .env.local with VITE_GROK_API_KEY${setDefault ? ' and VITE_DEFAULT_AI_PROVIDER=grok' : ''}`);
