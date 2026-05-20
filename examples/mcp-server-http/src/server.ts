/**
 * Rental AI — Remote HTTP MCP Server (for Grok Business / grok.com/connectors)
 *
 * This is the deployable version you register as a Custom MCP connector.
 * It exposes the same tools as the stdio example but over Streamable HTTP / SSE
 * so Grok (and other remote MCP clients) can reach it over the public internet.
 *
 * Deploy this, get a public https:// URL, then add it in:
 *   - https://grok.com/connectors  → New Connector → Custom
 *   - or the Grok Business Apps section in console.x.ai
 *
 * Usage (local):
 *   export RENTAL_AI_KEY="atxr_..."
 *   export MCP_AUTH_TOKEN="optional-shared-secret-for-the-mcp-endpoint"
 *   npm run dev
 *
 * Then point Grok at: http://localhost:3000/mcp
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = process.env.RENTAL_AI_BASE_URL || 'https://fintech-advisor.ai';
const RENTAL_KEY = process.env.RENTAL_AI_KEY;
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN; // optional bearer token for the /mcp endpoint
const PORT = Number(process.env.PORT || 3000);

if (!RENTAL_KEY?.startsWith('atxr_')) {
  console.error('FATAL: RENTAL_AI_KEY must be set to a valid atxr_* key');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tool Definitions (identical to stdio version for consistency)
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
// HTTP helper (re-uses the same pattern as the stdio example)
// ---------------------------------------------------------------------------
async function rentalFetch(path: string, init: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Authorization': `Bearer ${RENTAL_KEY}`,
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
// Tool Handlers (same logic as stdio reference)
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
    content: [{ type: 'text', text: (res.body?.data?.response || '') + meta }]
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
// MCP Server
// ---------------------------------------------------------------------------
const mcpServer = new Server(
  { name: 'rental-ai-remote-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

mcpServer.setRequestHandler(CallToolRequestSchema, async (req) => {
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
// Simple auth middleware for the MCP endpoint
// ---------------------------------------------------------------------------
function isAuthorized(req: IncomingMessage): boolean {
  if (!MCP_AUTH_TOKEN) return true; // no token configured → open (you control network access)

  const auth = req.headers['authorization'];
  if (!auth) return false;

  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return false;

  return token === MCP_AUTH_TOKEN;
}

// ---------------------------------------------------------------------------
// HTTP Server + Streamable HTTP Transport
// ---------------------------------------------------------------------------
async function main() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: false // let the transport decide (SSE streaming when appropriate)
  });

  await mcpServer.connect(transport);

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || '/';

    // Health check (no auth needed)
    if (url === '/health' || url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        service: 'rental-ai-mcp-http',
        version: '0.1.0'
      }));
      return;
    }

    // MCP endpoint
    if (url.startsWith('/mcp')) {
      if (!isAuthorized(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorized', message: 'Valid Authorization: Bearer <MCP_AUTH_TOKEN> required' }));
        return;
      }

      try {
        await transport.handleRequest(req, res);
      } catch (err) {
        console.error('Transport error:', err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      }
      return;
    }

    // Unknown route
    res.writeHead(404);
    res.end('Not Found');
  });

  httpServer.listen(PORT, () => {
    console.log(`Rental AI HTTP MCP server listening on port ${PORT}`);
    console.log(`  MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`  Health:       http://localhost:${PORT}/health`);
    if (MCP_AUTH_TOKEN) {
      console.log('  Auth: Bearer token required (MCP_AUTH_TOKEN is set)');
    } else {
      console.log('  WARNING: No MCP_AUTH_TOKEN set — endpoint is open (fine for local dev / trusted networks)');
    }
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
