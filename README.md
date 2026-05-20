# xFinance Rental AI — Public MCP & Agent Handoff (v1.1.1)

**White-label, tenant-isolated Grok-powered options-aware advisor HTTP API.**

This repository is the **official public landing** for partners, MCP tool authors, A2A implementers, and LLM crawlers. It contains everything you need to build a high-quality integration against the Rental AI surface **without** access to the private monorepo.

**Production base URL:** `https://fintech-advisor.ai`

**Live OpenAPI (canonical):** `GET https://fintech-advisor.ai/api/openapi` — filter by tag `rental-ai`

---

## For MCP Tool Authors (Fast Path)

1. Read this README (you are here).
2. Authenticate with a per-tenant `atxr_<id>_<secret>` Bearer key (scopes: `chat`, `strategy`, `analyze`).
3. Map one MCP tool per primary operation (or use the reference implementation in `examples/mcp-server/`).
4. Handle **SSE streaming** for chat and the **202 + poll** pattern for strategy/analyze jobs.
5. Surface the metering headers (`x-rental-tokens-used`, `x-rental-tokens-remaining`) to your users.
6. For deeper patterns, error shapes, and production reference code, see **[docs/mcp-implementation-guide.md](docs/mcp-implementation-guide.md)**.

You should be able to ship a working MCP server in < 1 day.

---

## Authentication

All requests require:

```
Authorization: Bearer atxr_<16-hex-key-id>_<64-hex-secret>
```

- Keys are minted per tenant via the admin API or ops tooling in the core platform.
- Each key declares one or more scopes. Routes enforce the matching scope.
- Keys are **never** logged in plaintext by the server.

**Do not** ship real keys in client code or public examples. Use environment variables and placeholder tokens in documentation.

---

## Core Capabilities

| Capability | Method & Path | Scope | Behavior |
|------------|---------------|-------|----------|
| **Chat** | `POST /api/ai/rent/chat` | `chat` | Natural language query with tenant `strategyBias` + workspace snapshot injected server-side. Returns markdown (or SSE stream). |
| **Strategy** | `POST /api/ai/rent/strategy` | `strategy` | `{ symbols[], portfolioId?, notes? }` → `202` with `jobId` + `pollUrl`. Poll for options strategy materialization. |
| **Analyze** | `POST /api/ai/rent/analyze` | `analyze` | `{ jobId?, deepRun? }` → `202` + poll. Deep portfolio / position analysis. |

### Chat (JSON + SSE)

**Request:**
```json
{
  "message": "Outline a conservative wheel income plan on NVDA using my current book.",
  "username": "partnerDesk",           // optional X handle → resolves to tenant member
  "portfolioId": "507f1f77bcf86cd799439011", // optional; scopes to owned portfolio
  "stream": false
}
```

**Success (200 JSON):**
```json
{
  "ok": true,
  "correlationId": "...",
  "tenantSlug": "acme-ia",
  "data": {
    "response": "# Conservative Wheel on NVDA\n...",
    "model": "grok-4-1-fast-reasoning",
    "usage": { ... }
  }
}
```

**Headers on success:**
- `x-rental-tokens-used`
- `x-rental-tokens-remaining`

**Streaming:** Send `Accept: text/event-stream` **or** `"stream": true`. Server emits OpenAI-style `chat.completion.chunk` deltas and terminates with `data: [DONE]`.

See the implementation guide for robust SSE client patterns.

### Strategy Job (async)

```bash
# Start
curl -X POST "$ORIGIN/api/ai/rent/strategy" \
  -H "Authorization: Bearer $RENTAL_TOKEN" \
  -d '{"symbols":["NVDA","SPY"],"notes":"conservative bias"}'

# Poll
curl "$ORIGIN/api/ai/rent/strategy?jobId=$JOB" \
  -H "Authorization: Bearer $RENTAL_TOKEN"
```

Returns `202` with `{ jobId, pollUrl }`. Poll until `status: "completed"` (MVP currently materializes quickly).

### Analyze Job

Same 202 + poll pattern. Use after a strategy job or standalone with `deepRun: true`.

---

## Recommended MCP Tool Shapes

For best ergonomics in agent frameworks:

- `rental_ai_chat(message, portfolioId?, stream?)` — primary conversational surface
- `rental_ai_create_strategy(symbols[], notes?, portfolioId?)` — returns jobId immediately
- `rental_ai_poll_strategy(jobId)` — or a combined "wait for completion" helper
- `rental_ai_analyze(jobId?, deepRun?)`

Expose the metering headers on every successful response so the host UI can show remaining budget.

**Never** claim the outputs are personalized financial advice. The server injects a standard disclaimer; your wrapper should too.

---

## Token Budgets & Guardrails

- Default **200,000 tokens / UTC day** per tenant (`maxDailyTokens` in `rentalProfile`).
- Failed guardrails (safety, policy) do **not** consume tokens.
- Concurrency cap (currently 8 per tenant) when Redis is enabled.
- Clients should treat `429` with `Retry-After` or the metering headers as signals to back off.

---

## Quickstarts

See **[examples/README.md](examples/README.md)** for copy-paste curl commands and the reference MCP server.

**Want the tools inside Grok (including Grok Business)?**  
Deploy the remote HTTP server in `examples/mcp-server-http/` and register the resulting public `/mcp` URL at:
- https://grok.com/connectors (Custom)
- or the **Apps** section of the Grok Business console (`console.x.ai/.../grok-business/apps`)

Full deployment + registration guide is in that folder’s README.

Minimal curl smoke test:

```bash
export XFINANCE_ORIGIN="https://fintech-advisor.ai"
export RENTAL_TOKEN="atxr_...your-key..."

curl -sS "$XFINANCE_ORIGIN/api/ai/rent/chat" \
  -H "Authorization: Bearer $RENTAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"One paragraph on wheel vs buy-write for NVDA.","stream":false}' \
  | jq .
```

---

## Machine-Readable Indexes

| File | Purpose |
|------|---------|
| [`llm.txt`](llm.txt) | Ultra-dense summary for LLM context windows and RAG |
| [`llms.txt`](llms.txt) | [llms.txt](https://llmstxt.org/) standard entry |
| [`openapi/rental-ai.yaml`](openapi/rental-ai.yaml) | Pinned OpenAPI 3.1 snapshot (rental-ai paths & schemas only) |

---

## Versioning & Source of Truth

- **Handoff surface (this repo):** v1.1.1 (this document + domain migration to fintech-advisor.ai)
- **API contract:** Phase 1 — paths and major schemas are stable
- **Live spec:** `GET /api/openapi` (always filter tag `rental-ai`)
- **Private implementation:** `atx-trusted-advisor` monorepo (`atx-docs/MCP-AI-ADVISOR.md`, `sre-ops/rental-ai-platform.md`)

When the underlying API evolves, this public mirror and docs are updated via the process in `AGENTS.md`.

---

## Compliance

Outputs are **educational only** and **not personalized investment advice**. No trade execution or order routing occurs through this API. All responses should carry appropriate disclaimers in your integration surface.

---

## Next Steps for Integrators

- Read **[docs/mcp-implementation-guide.md](docs/mcp-implementation-guide.md)** for streaming clients, polling loops, error taxonomy, and production TypeScript / Python examples.
- Clone `examples/mcp-server/` as a starting point for your own tool.
- Contact your aTx Finance representative for tenant onboarding, key issuance, and commercial terms.

**No atoms moved. Just gains earned.**
