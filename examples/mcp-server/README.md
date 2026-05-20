# Rental AI — Reference MCP Server (TypeScript)

A minimal, copy-paste-friendly stdio MCP server that turns the three Rental AI HTTP operations into MCP tools.

**This is a reference implementation**, not a batteries-included product. Read it, understand it, then extend or rewrite for your stack.

## Quick Start

```bash
cd examples/mcp-server

# 1. Install
npm install

# 2. Build
npm run build

# 3. Run (requires a real rental key with chat+strategy+analyze scopes)
export RENTAL_AI_KEY="atxr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
npm start
```

Then register the server in your MCP host:

- **Cursor / Claude Desktop**: add to your MCP config as a stdio server pointing at the built `dist/index.js`
- **Grok / other hosts**: use the same command line

## Environment

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `RENTAL_AI_KEY` | Yes | — | `atxr_*` Bearer key |
| `RENTAL_AI_BASE_URL` | No | `https://atx.fintech-advisor.ai` | Override for staging / local dev |

## Exposed Tools

- `rental_ai_chat`
- `rental_ai_create_strategy` + `rental_ai_get_strategy`
- `rental_ai_create_analyze` + `rental_ai_get_analyze`

See the JSDoc in `src/index.ts` and the main [docs/mcp-implementation-guide.md](../../docs/mcp-implementation-guide.md) for usage patterns, streaming notes, and production hardening advice.

## Next Steps (Recommended Hardening)

1. Add a small retry + circuit-breaker layer around the HTTP calls.
2. Cache token-remaining values for 30–60s to reduce header noise.
3. Add a `rental_ai_get_budget` tool that only calls the metering endpoint.
4. Support per-tenant key rotation without restarting the process.
5. Add structured logging with `correlationId`.
6. Turn this into a Docker image or a hosted MCP server if your agents run remotely.

## Python Version

A Python equivalent using the `mcp` SDK is planned. For now the TypeScript version is the canonical reference because the official SDK is mature and the pattern is easy to port.

## License

Unlicense (same as parent repo). Use freely as a foundation for your own integration.
