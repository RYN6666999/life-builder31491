#!/usr/bin/env node
/**
 * Vercel Build Debug Script
 * 
 * Run this before the actual build to diagnose configuration issues.
 * Usage: node scripts/vercel-debug.cjs
 */

const fs = require('fs');
const path = require('path');

console.log('\n=== VERCEL DEBUG INFO ===\n');

console.log('1. Working Directory:');
console.log('   cwd:', process.cwd());
console.log('   __dirname:', __dirname);

console.log('\n2. Node Version:');
console.log('   ', process.version);

console.log('\n3. Environment Variables:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   VERCEL:', process.env.VERCEL);
console.log('   REPL_ID:', process.env.REPL_ID || 'not set');

console.log('\n4. Config Files Check:');

const configPaths = [
  'tailwind.config.cjs',
  'postcss.config.cjs',
  'client/tailwind.config.cjs',
  'client/postcss.config.cjs',
  'vite.config.ts',
  '.nvmrc',
];

configPaths.forEach(p => {
  const exists = fs.existsSync(p);
  console.log(`   ${p}: ${exists ? '✓ exists' : '✗ missing'}`);
});

console.log('\n5. Client Directory Contents:');
try {
  const clientFiles = fs.readdirSync('client').slice(0, 20);
  clientFiles.forEach(f => console.log(`   - ${f}`));
} catch (e) {
  console.log('   Error:', e.message);
}

console.log('\n6. Tailwind Config Content Preview:');
const twConfigPaths = ['client/tailwind.config.cjs', 'tailwind.config.cjs'];
for (const p of twConfigPaths) {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const contentMatch = content.match(/content:\s*\[[\s\S]*?\]/);
    console.log(`   ${p}:`);
    if (contentMatch) {
      console.log(`   ${contentMatch[0].replace(/\n/g, '\n   ')}`);
    } else {
      console.log(`   (content array not found)`);
    }
    break;
  }
}

console.log('\n7. PostCSS Config Check:');
const pcConfigPaths = ['client/postcss.config.cjs', 'postcss.config.cjs'];
for (const p of pcConfigPaths) {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    console.log(`   ${p}:`);
    console.log(`   ${content.slice(0, 300).replace(/\n/g, '\n   ')}`);
    break;
  }
}

console.log('\n8. package.json devDependencies Check:');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const relevantDeps = ['tailwindcss', 'postcss', 'autoprefixer'];
  relevantDeps.forEach(dep => {
    const version = pkg.devDependencies?.[dep] || pkg.dependencies?.[dep] || 'NOT FOUND';
    console.log(`   ${dep}: ${version}`);
  });
} catch (e) {
  console.log('   Error:', e.message);
}

console.log('\n9. Tailwind CLI Test:');
try {
  const { execSync } = require('child_process');
  const result = execSync('npx tailwindcss --help 2>&1 | head -5', { encoding: 'utf8' });
  console.log('   Tailwind CLI available');
} catch (e) {
  console.log('   Error:', e.message);
}

console.log('\n=== END DEBUG INFO ===\n');
