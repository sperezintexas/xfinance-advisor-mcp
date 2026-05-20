#!/usr/bin/env node
/**
 * validate-openapi.mjs
 * Minimal OpenAPI 3.1 validation for the public Rental AI handoff spec.
 * Fails the build if the static mirror is not parseable or is missing required rental-ai paths.
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(__dirname, '..', 'openapi', 'rental-ai.yaml');

async function main() {
  console.log('🔍 Validating OpenAPI spec:', specPath);

  try {
    const api = await SwaggerParser.validate(specPath, {
      continueOnError: false,
      dereference: { circular: 'ignore' }
    });

    const paths = Object.keys(api.paths || {});
    const rentalPaths = paths.filter(p => p.startsWith('/api/ai/rent'));

    if (rentalPaths.length === 0) {
      console.error('❌ No /api/ai/rent/* paths found. The rental-ai tag filter may have failed.');
      process.exit(1);
    }

    const hasChat = rentalPaths.some(p => p.includes('/chat'));
    const hasStrategy = rentalPaths.some(p => p.includes('/strategy'));
    const hasAnalyze = rentalPaths.some(p => p.includes('/analyze'));

    if (!hasChat || !hasStrategy || !hasAnalyze) {
      console.error('❌ Missing expected rental endpoints. Found:', rentalPaths);
      process.exit(1);
    }

    console.log('✅ OpenAPI 3.1 document is valid.');
    console.log(`   Title: ${api.info.title}`);
    console.log(`   Version: ${api.info.version}`);
    console.log(`   Rental paths found: ${rentalPaths.length}`);
    console.log('   ✓ chat, strategy, and analyze operations present.');
    process.exit(0);
  } catch (err) {
    console.error('❌ OpenAPI validation failed:');
    console.error(err.message || err);
    if (err.errors) {
      console.error(JSON.stringify(err.errors, null, 2));
    }
    process.exit(1);
  }
}

main();
