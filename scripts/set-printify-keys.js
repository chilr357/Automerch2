#!/usr/bin/env node

// Write VITE_PRINTIFY_API_KEY and VITE_PRINTIFY_SHOP_ID into .env.local
// Usage:
//   node scripts/set-printify-keys.js --api-key=YOUR_KEY --shop-id=YOUR_SHOP_ID
// Or via npm:
//   npm run set:printify -- --api-key=YOUR_KEY --shop-id=YOUR_SHOP_ID

import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const envPath = path.join(cwd, '.env.local');

function parseArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const argApiKey = parseArg('api-key') || process.env.VITE_PRINTIFY_API_KEY || process.env.PRINTIFY_API_KEY;
const argShopId = parseArg('shop-id') || process.env.VITE_PRINTIFY_SHOP_ID || process.env.PRINTIFY_SHOP_ID;

if (!argApiKey || !argShopId) {
  console.error('Missing required args. Provide both --api-key and --shop-id (or env VITE_PRINTIFY_API_KEY and VITE_PRINTIFY_SHOP_ID).');
  process.exit(1);
}

let content = '';
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, 'utf8');
}

function upsertLine(key, value) {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    if (content.length && !content.endsWith('\n')) content += '\n';
    content += `${line}\n`;
  }
}

upsertLine('VITE_PRINTIFY_API_KEY', argApiKey);
upsertLine('VITE_PRINTIFY_SHOP_ID', argShopId);

fs.writeFileSync(envPath, content, 'utf8');
console.log('Updated .env.local with VITE_PRINTIFY_API_KEY and VITE_PRINTIFY_SHOP_ID');


