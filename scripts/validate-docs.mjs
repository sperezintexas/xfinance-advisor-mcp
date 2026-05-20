#!/usr/bin/env node
/**
 * validate-docs.mjs
 * Lightweight documentation structure + sanity checks for the public handoff repo.
 * - Ensures critical files exist
 * - Basic frontmatter / heading sanity on README and key docs
 * - Can be extended with markdownlint or link checks later
 */

import { readFile, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'LICENSE',
  'CHANGELOG.md',
  'llm.txt',
  'llms.txt',
  'openapi/rental-ai.yaml',
  'docs/mcp-implementation-guide.md',
  'examples/README.md'
];

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('📄 Running documentation structure validation...');

  let failures = 0;

  // 1. Required files
  for (const f of requiredFiles) {
    const full = path.join(root, f);
    if (!(await fileExists(full))) {
      console.error(`❌ Missing required file: ${f}`);
      failures++;
    } else {
      console.log(`   ✓ ${f}`);
    }
  }

  // 2. README must mention the three core endpoints and auth pattern
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  const requiredPhrases = [
    'atxr_',
    '/api/ai/rent/chat',
    '/api/ai/rent/strategy',
    '/api/ai/rent/analyze',
    'x-rental-tokens'
  ];
  for (const phrase of requiredPhrases) {
    if (!readme.includes(phrase)) {
      console.error(`❌ README.md is missing expected content: "${phrase}"`);
      failures++;
    }
  }

  // 3. llm.txt must be short and high-signal (sanity)
  const llm = await readFile(path.join(root, 'llm.txt'), 'utf8');
  if (llm.length > 4000) {
    console.warn('⚠️  llm.txt is quite long (>4k chars). Consider trimming for LLM context windows.');
  }
  if (!llm.includes('POST /api/ai/rent/chat')) {
    console.error('❌ llm.txt does not contain the expected endpoint summary.');
    failures++;
  }

  // 4. mcp guide must exist and have substance
  const guide = await readFile(path.join(root, 'docs/mcp-implementation-guide.md'), 'utf8');
  if (guide.length < 2000) {
    console.error('❌ docs/mcp-implementation-guide.md appears too short for a useful implementation guide.');
    failures++;
  }

  if (failures > 0) {
    console.error(`\n❌ Documentation validation failed with ${failures} issue(s).`);
    process.exit(1);
  }

  console.log('\n✅ Documentation structure and content sanity checks passed.');
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected validation error:', err);
  process.exit(1);
});
