#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('Airavoto Gaming POS - Desktop Setup');
console.log('='.repeat(60));

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory: ' + dataDir);
}

const envExample = path.join(__dirname, '..', '.env.example');
const envFile = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, envFile);
  console.log('Created .env file from .env.example');
  console.log('Please edit .env to set your admin credentials!');
}

console.log('');
console.log('Setup complete! Next steps:');
console.log('');
console.log('1. Copy the "client" folder from the main project:');
console.log('   cp -r ../client ./client');
console.log('');
console.log('2. Copy the "attached_assets" folder:');
console.log('   cp -r ../attached_assets ./attached_assets');
console.log('');
console.log('3. Install dependencies:');
console.log('   npm install');
console.log('');
console.log('4. Build the application:');
console.log('   npm run build');
console.log('');
console.log('5. Start the application:');
console.log('   npm start');
console.log('');
console.log('='.repeat(60));
