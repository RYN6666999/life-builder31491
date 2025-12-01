#!/usr/bin/env node
/**
 * Tailwind Config Validator
 * 
 * Validates that tailwind.config.cjs exists and has proper content paths.
 * Run before build to catch configuration issues early.
 * 
 * Usage: node scripts/validate-tailwind-config.js
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATHS = [
  'client/tailwind.config.cjs',
  'client/tailwind.config.js',
];

const POSTCSS_PATHS = [
  'client/postcss.config.cjs',
  'client/postcss.config.js',
];

function findConfig(paths, type) {
  for (const p of paths) {
    const fullPath = path.resolve(process.cwd(), p);
    if (fs.existsSync(fullPath)) {
      return { path: p, fullPath };
    }
  }
  return null;
}

function validateTailwindConfig(configPath) {
  const errors = [];
  const warnings = [];

  try {
    const config = require(configPath);
    
    if (!config.content || !Array.isArray(config.content)) {
      errors.push('content is missing or not an array');
    } else if (config.content.length === 0) {
      errors.push('content array is empty - no files will be scanned');
    } else {
      const hasHtmlPath = config.content.some(p => 
        typeof p === 'string' && p.includes('.html')
      );
      const hasSrcPath = config.content.some(p => 
        typeof p === 'string' && p.includes('src')
      );
      
      if (!hasHtmlPath) {
        warnings.push('content does not include any .html files');
      }
      if (!hasSrcPath) {
        warnings.push('content does not include src directory');
      }
    }

    if (!config.theme) {
      warnings.push('theme configuration is missing');
    }

    if (!config.darkMode) {
      warnings.push('darkMode is not configured');
    }

  } catch (err) {
    errors.push(`Failed to load config: ${err.message}`);
  }

  return { errors, warnings };
}

function main() {
  console.log('🔍 Validating Tailwind CSS configuration...\n');

  let hasErrors = false;

  const tailwindConfig = findConfig(CONFIG_PATHS, 'Tailwind');
  if (!tailwindConfig) {
    console.error('❌ Tailwind config not found in any of:', CONFIG_PATHS);
    process.exit(1);
  }
  console.log(`✓ Found Tailwind config: ${tailwindConfig.path}`);

  const postcssConfig = findConfig(POSTCSS_PATHS, 'PostCSS');
  if (!postcssConfig) {
    console.error('❌ PostCSS config not found in any of:', POSTCSS_PATHS);
    process.exit(1);
  }
  console.log(`✓ Found PostCSS config: ${postcssConfig.path}`);

  const { errors, warnings } = validateTailwindConfig(tailwindConfig.fullPath);

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`   - ${e}`));
    hasErrors = true;
  }

  if (!hasErrors) {
    console.log('\n✅ Tailwind configuration is valid!');
    process.exit(0);
  } else {
    console.log('\n❌ Tailwind configuration has issues that may cause build failures.');
    process.exit(1);
  }
}

main();
