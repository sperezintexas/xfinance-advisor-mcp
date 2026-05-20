# Quickstart — Rental AI HTTP API + MCP

**Base URL (production):** `https://atx.fintech-advisor.ai`

**Auth:** `Authorization: Bearer atxr_<16-hex>_<64-hex>`

All examples below assume:

```bash
export XFINANCE_ORIGIN="https://atx.fintech-advisor.ai"
export RENTAL_TOKEN="atxr_...your-key-with-chat-strategy-analyze..."
```

Use TLS only. The token must have the scopes required by each endpoint.

---

## 1. Raw HTTP (curl)

### Chat (JSON + metering headers)

```bash
curl -sS "${XFINANCE_ORIGIN}/api/ai/rent/chat" \
  -H "Authorization: Bearer ${RENTAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message":"Summarize defined-risk income ideas for a tech-heavy book.","stream":false}' \
  -D /tmp/rental-hdr.txt -o /tmp/rental-body.json

grep -i x-rental /tmp/rental-hdr.txt || true
cat /tmp/rental-body.json
```

### Chat (SSE streaming)

```bash
curl -sS -N "${XFINANCE_ORIGIN}/api/ai/rent/chat" \
  -H "Authorization: Bearer ${RENTAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"message":"One paragraph on wheel vs buy-write for NVDA.","stream":true}'
```

### Strategy job (fire + poll)

```bash
ACC=$(curl -sS -X POST "${XFINANCE_ORIGIN}/api/ai/rent/strategy" \
  -H "Authorization: Bearer ${RENTAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"symbols":["NVDA","SPY"],"notes":"conservative bias"}')

echo "$ACC"
JOB=$(echo "$ACC" | sed -n 's/.*"jobId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

curl -sS "${XFINANCE_ORIGIN}/api/ai/rent/strategy?jobId=${JOB}" \
  -H "Authorization: Bearer ${RENTAL_TOKEN}"
```

### Analyze job

Same pattern as strategy using `/api/ai/rent/analyze`.

### Live OpenAPI (filter to rental-ai)

```bash
curl -sS "${XFINANCE_ORIGIN}/api/openapi" | jq '.paths | keys | map(select(startswith("/api/ai/rent")))'
```

---

## 2. Reference MCP Server (Recommended Starting Point)

A complete, minimal, well-documented TypeScript stdio MCP server lives in:

```
examples/mcp-server/
```

It exposes:

- `rental_ai_chat`
- `rental_ai_create_strategy` / `rental_ai_get_strategy`
- `rental_ai_create_analyze` / `rental_ai_get_analyze`

### Run the reference server

```bash
cd examples/mcp-server
npm install
npm run build
export RENTAL_AI_KEY="$RENTAL_TOKEN"
npm start
```

Then register it with your MCP host (Cursor, Claude Desktop, Grok, etc.) as a stdio server.

Full instructions and hardening checklist: [examples/mcp-server/README.md](mcp-server/README.md)

Deep implementation patterns (streaming, polling, error mapping, production checklist): **[docs/mcp-implementation-guide.md](../docs/mcp-implementation-guide.md)**

---

## Private Implementation Source

The actual routes, metering, personas, and OpenAPI generator live in the private monorepo `atx-trusted-advisor`.

- Deep handoff: `atx-docs/MCP-AI-ADVISOR.md`
- Ops runbook: `atx-docs/sre-ops/rental-ai-platform.md`
- System prompt + bias: `atx-docs/guides/rental-ai-system-prompt.md`

This public repo is deliberately self-contained for 90% of integration work. You only need the private docs when you are a tenant operator provisioning new rental profiles or debugging production incidents.
