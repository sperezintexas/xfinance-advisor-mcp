/**
 * Rental AI MCP Server — Minimal Reference Implementation
 *
 * This is a deliberately small, well-commented stdio MCP server that
 * exposes the three core Rental AI capabilities as tools.
 *
 * It is intended as a **starting point**, not a production deployment.
 * Copy it, understand every line, then harden it for your environment.
 *
 * Usage:
 *   export RENTAL_AI_KEY="atxr_..."
 *   npm run dev
 *
 * Then register the server in your MCP host (Claude, Cursor, Grok, etc.)
 * via the stdio command: `node dist/index.js` (after build) or use tsx in dev.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = process.env.RENTAL_AI_BASE_URL || 'https://atx.fintech-advisor.ai';
const API_KEY = process.env.RENTAL_AI_KEY;

if (!API_KEY?.startsWith('atxr_')) {
  console.error('FATAL: RENTAL_AI_KEY must be set to a valid atxr_* key');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tool Definitions (what the LLM / agent sees)
// ---------------------------------------------------------------------------

const tools: Tool[] = [
  {
    name: 'rental_ai_chat',
    description: 'Send a natural language question to the tenant-scoped Rental AI advisor. ' +
      'Returns markdown analysis with options-aware context and the tenant strategyBias injected. ' +
      'Supports streaming. IMPORTANT: outputs are educational only and NOT personalized financial advice.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The user question or instruction' },
        portfolioId: { type: 'string', description: 'Optional 24-hex Mongo portfolio id to scope context' },
        stream: { type: 'boolean', description: 'If true, returns SSE-style deltas (recommended for UX)', default: false }
      },
      required: ['message']
    }
  },
  {
    name: 'rental_ai_create_strategy',
    description: 'Start an async options strategy materialization job for the given symbols. ' +
      'Returns a jobId immediately. Poll with rental_ai_get_strategy.',
    inputSchema: {
      type: 'object',
      properties: {
        symbols: { type: 'array', items: { type: 'string' }, description: 'e.g. ["NVDA", "SPY", "TSLA"]' },
        notes: { type: 'string', description: 'Free-text bias or constraints (e.g. "conservative income only")' },
        portfolioId: { type: 'string', description: 'Optional owned portfolio to enrich context' }
      },
      required: ['symbols']
    }
  },
  {
    name: 'rental_ai_get_strategy',
    description: 'Poll a previously created strategy job. Returns status + result when completed.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The jobId returned from rental_ai_create_strategy' }
      },
      required: ['jobId']
    }
  },
  {
    name: 'rental_ai_create_analyze',
    description: 'Kick off (or continue) a deep portfolio/position analysis. Returns jobId.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Optional existing jobId to extend' },
        deepRun: { type: 'boolean', description: 'Run deeper / more expensive analysis', default: false }
      }
    }
  },
  {
    name: 'rental_ai_get_analyze',
    description: 'Poll an analyze job. Returns status + narrative or structured result.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' }
      },
      required: ['jobId']
    }
  }
];

// ---------------------------------------------------------------------------
// HTTP Helper (with proper error + header extraction)
// ---------------------------------------------------------------------------

async function rentalFetch(path: string, init: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init.headers || {})
    }
  });

  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }

  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body
  };
}

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

async function handleChat(args: any) {
  const { message, portfolioId, stream = false } = args;

  const res = await rentalFetch('/api/ai/rent/chat', {
    method: 'POST',
    body: JSON.stringify({ message, portfolioId, stream })
  });

  if (res.status >= 400) {
    return { content: [{ type: 'text', text: `Error ${res.status}: ${JSON.stringify(res.body)}` }], isError: true };
  }

  const used = res.headers['x-rental-tokens-used'];
  const remaining = res.headers['x-rental-tokens-remaining'];

  const meta = used ? `\n\n---\nTokens used: ${used} | remaining: ${remaining} (UTC day)` : '';

  return {
    content: [{ type: 'text', text: res.body?.data?.response + meta }]
  };
}

async function handleCreateStrategy(args: any) {
  const res = await rentalFetch('/api/ai/rent/strategy', {
    method: 'POST',
    body: JSON.stringify(args)
  });

  if (res.status >= 400) {
    return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.body)}` }], isError: true };
  }

  return {
    content: [{
      type: 'text',
      text: `Strategy job created.\njobId: ${res.body.jobId}\nPoll with: rental_ai_get_strategy({ jobId: "${res.body.jobId}" })`
    }]
  };
}

async function handleGetStrategy(args: any) {
  const { jobId } = args;
  const res = await rentalFetch(`/api/ai/rent/strategy?jobId=${jobId}`);

  if (res.status >= 400) {
    return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.body)}` }], isError: true };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(res.body, null, 2) }]
  };
}

async function handleCreateAnalyze(args: any) {
  const res = await rentalFetch('/api/ai/rent/analyze', {
    method: 'POST',
    body: JSON.stringify(args)
  });

  if (res.status >= 400) {
    return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.body)}` }], isError: true };
  }

  return {
    content: [{
      type: 'text',
      text: `Analyze job created.\njobId: ${res.body.jobId}\nUse rental_ai_get_analyze to poll.`
    }]
  };
}

async function handleGetAnalyze(args: any) {
  const { jobId } = args;
  const res = await rentalFetch(`/api/ai/rent/analyze?jobId=${jobId}`);

  if (res.status >= 400) {
    return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.body)}` }], isError: true };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(res.body, null, 2) }]
  };
}

// ---------------------------------------------------------------------------
// MCP Server Wiring
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'rental-ai-mcp-server', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;

  try {
    switch (name) {
      case 'rental_ai_chat': return await handleChat(args);
      case 'rental_ai_create_strategy': return await handleCreateStrategy(args);
      case 'rental_ai_get_strategy': return await handleGetStrategy(args);
      case 'rental_ai_create_analyze': return await handleCreateAnalyze(args);
      case 'rental_ai_get_analyze': return await handleGetAnalyze(args);
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `Unexpected error: ${err.message || err}` }],
      isError: true
    };
  }
});

// ---------------------------------------------------------------------------
// Start (stdio transport — the MCP host spawns this process)
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Rental AI MCP server started (stdio). Waiting for host...');
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
