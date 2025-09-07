#!/usr/bin/env node

/**
 * Automerch2 Setup Script
 * Interactive setup for API keys and configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const API_KEYS = {
  'OpenAI API Key (Required for DALL-E 3)': 'VITE_OPENAI_API_KEY',
  'Midjourney API Key (Optional, for anime generation)': 'VITE_MIDJOURNEY_API_KEY',
  'ImgBB API Key (Required for image storage)': 'VITE_IMGBB_API_KEY',
  'Printify API Key (Required for print-on-demand)': 'VITE_PRINTIFY_API_KEY',
  'Printify Shop ID (Required for print-on-demand)': 'VITE_PRINTIFY_SHOP_ID',
  'Stripe Publishable Key (Optional, for payments)': 'VITE_STRIPE_PUBLISHABLE_KEY',
  'Stripe Secret Key (Optional, for payments)': 'VITE_STRIPE_SECRET_KEY',
  'Supabase URL (Optional, for database)': 'VITE_NEXT_PUBLIC_SUPABASE_URL',
  'Supabase Anon Key (Optional, for database)': 'VITE_NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'Supabase Service Role Key (Optional, for database)': 'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'NextAuth Secret (Optional, for authentication)': 'VITE_NEXTAUTH_SECRET',
  'Gemini API Key (Fallback AI provider)': 'VITE_GEMINI_API_KEY',
};

const REQUIRED_KEYS = [
  'VITE_OPENAI_API_KEY',
  'VITE_IMGBB_API_KEY',
  'VITE_PRINTIFY_API_KEY',
  'VITE_PRINTIFY_SHOP_ID',
];

async function main() {
  console.log('🚀 Welcome to Automerch2 Setup!');
  console.log('This script will help you configure your API keys.\n');

  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';

  // Check if .env.local already exists
  if (fs.existsSync(envPath)) {
    const existingContent = fs.readFileSync(envPath, 'utf8');
    console.log('📁 Found existing .env.local file');
    
    const overwrite = await question('Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n🔑 Please enter your API keys (press Enter to skip optional ones):\n');

  for (const [description, key] of Object.entries(API_KEYS)) {
    const isRequired = REQUIRED_KEYS.includes(key);
    const requiredText = isRequired ? ' (REQUIRED)' : ' (Optional)';
    
    let value = await question(`${description}${requiredText}: `);
    
    if (!value && isRequired) {
      console.log(`⚠️  ${description} is required! Please enter a value.`);
      value = await question(`${description} (REQUIRED): `);
    }
    
    if (value) {
      envContent += `${key}=${value}\n`;
    }
  }

  // Add legacy API_KEY for backward compatibility
  const geminiKey = envContent.match(/VITE_GEMINI_API_KEY=(.+)/)?.[1];
  if (geminiKey) {
    envContent += `API_KEY=${geminiKey}\n`;
  }

  // Add default values
  envContent += '\n# Default configuration\n';
  envContent += 'VITE_NEXTAUTH_URL=http://localhost:3000\n';
  envContent += 'VITE_PRINTIFY_ETSY_SHOP_ID=16894095\n';

  // Write the file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ Configuration saved to .env.local');
  console.log('\n📋 Next steps:');
  console.log('1. Run "npm run dev" to start the development server');
  console.log('2. Open http://localhost:5173 in your browser');
  console.log('3. Test your integrations by generating an image');
  
  console.log('\n🔗 API Key Sources:');
  console.log('• OpenAI: https://platform.openai.com/api-keys');
  console.log('• Midjourney: https://www.midjourney.com/api/');
  console.log('• ImgBB: https://api.imgbb.com/');
  console.log('• Printify: https://printify.com/app/account/api-keys');
  console.log('• Stripe: https://dashboard.stripe.com/apikeys');
  console.log('• Supabase: https://supabase.com/dashboard');
  
  rl.close();
}

main().catch(console.error);
