# MCP Implementation Guide — Rental AI API

**Audience:** Developers building production MCP servers, custom agents, or A2A connectors for the aTx Finance Rental AI (white-label) surface.

This guide assumes you have read the main [README](../README.md) and have a valid `atxr_*` key with the appropriate scopes.

---

## Design Principles for a Great Rental AI MCP Server

1. **One tool per primary capability** (chat, create-strategy, poll-strategy, analyze).
2. **Streaming is first-class** — many agents prefer token-by-token UX.
3. **Always surface metering** — `x-rental-tokens-remaining` is the most important signal for the end user.
4. **Treat jobs as first-class resources** — strategy and analyze are async; expose both "fire-and-poll" and "wait-for-completion" helpers.
5. **Never over-claim** — the server already injects "not financial advice"; your wrapper must not contradict it.
6. **Fail closed on auth / scope errors** — return clear, actionable error objects the host can present.

---

## Recommended Tool Inventory (MCP)

| Tool Name | Description | Required Scopes |
|-----------|-------------|-----------------|
| `rental_ai_chat` | Send a message, get markdown (or stream) | `chat` |
| `rental_ai_create_strategy` | Submit symbols + notes, receive jobId | `strategy` |
| `rental_ai_get_strategy` | Poll a strategy job | `strategy` |
| `rental_ai_create_analyze` | Kick off (or continue) analysis | `analyze` |
| `rental_ai_get_analyze` | Poll an analyze job | `analyze` |
| `rental_ai_get_budget` | (Optional) Return current token usage/remaining for the key's tenant | `chat` |

Some hosts prefer a single `rental_ai_request` polymorphic tool + separate pollers. Choose the granularity that feels natural in your agent framework.

---

## Authentication Wrapper (Critical)

Never put the raw key in the MCP tool description. Use a thin client that reads from:

- Environment variable (`RENTAL_AI_KEY`)
- Per-tenant secret store
- OAuth / key-vault injected at runtime

Example pattern (TypeScript):

```ts
function getRentalClient() {
  const key = process.env.RENTAL_AI_KEY;
  if (!key?.startsWith('atxr_')) throw new Error('Missing or invalid RENTAL_AI_KEY');
  return new RentalAiClient(key, { baseUrl: 'https://atx.fintech-advisor.ai' });
}
```

---

## Streaming Chat (SSE) — Robust Client Pattern

The chat endpoint supports two modes:

- `stream: false` (or omit) → `200` JSON with `data.response`
- `stream: true` or `Accept: text/event-stream` → SSE with `chat.completion.chunk` deltas

**Recommended client behavior:**

1. If the caller requests streaming, set both the header **and** the body flag.
2. Use a standard SSE parser (or the one from `@modelcontextprotocol/sdk` if applicable).
3. Accumulate deltas into a single assistant message.
4. On `[DONE]`, attach the final `x-rental-tokens-*` headers (they arrive on the response, not per-chunk).
5. Surface partial tokens to the UI as they arrive for low perceived latency.

Common pitfall: some proxies / MCP hosts buffer SSE. Test with `curl -N`.

---

## Job Polling Pattern (Strategy & Analyze)

Both async endpoints follow the same contract:

```json
// 202 response
{
  "jobId": "01H...",
  "pollUrl": "/api/ai/rent/strategy?jobId=01H...",
  "status": "pending"   // or "running", "completed", "failed"
}
```

**Polling recommendations:**

- Start with 500–800ms interval, exponential backoff to 2–3s max.
- Add a `timeoutMs` (e.g., 120s) and surface `poll_timeout` error.
- When `status === "completed"`, the `result` field contains the materialization (markdown or structured data depending on job type).
- Store `jobId` in the conversation thread so follow-up "tell me more about that strategy" can reference it.

---

## Error Taxonomy (What Your Wrapper Should Map)

| HTTP | Typical Body Shape | MCP Error Code Suggestion | Notes |
|------|--------------------|---------------------------|-------|
| 401 | `{ error: "unauthorized" }` | `auth_error` | Bad or revoked key |
| 403 | `{ error: "forbidden", requiredScope: "strategy" }` | `scope_error` | Key lacks the needed scope |
| 429 | `{ error: "rate_limited" }` + `Retry-After` | `rate_limited` | Per-tenant or global rental limit |
| 402 | `{ error: "budget_exhausted", tokensRemaining: 0 }` | `budget_exhausted` | Daily token cap hit |
| 400 | `{ error: "validation_error", issues: [...] }` | `bad_request` | Malformed body |
| 422 | `{ error: "guardrail_blocked", reason: "..." }` | `policy_blocked` | Safety or policy refusal (no tokens burned) |

Always include the original `correlationId` when present — it is invaluable for support.

---

## Reference Implementation (Copy-Paste Starting Point)

See `examples/mcp-server/` in the root of this repository. It contains a minimal, well-commented stdio MCP server using the official TypeScript SDK that exposes:

- `rental_ai_chat`
- `rental_ai_create_strategy` + `rental_ai_get_strategy`
- `rental_ai_create_analyze` + `rental_ai_get_analyze`

The example deliberately keeps the implementation under ~300 LOC so you can understand every line before extending it.

**Python alternative:** The same structure works with `mcp` (Python SDK). A minimal example is included in the same folder.

---

## Production Hardening Checklist

- [ ] Key is loaded from a secret manager / env, never hardcoded
- [ ] Every successful tool response includes `tokens_remaining` in the structured content
- [ ] Streaming chat has a 30–60s idle timeout + heartbeat
- [ ] Job polling has a maximum wait + returns a `still_running` partial result
- [ ] All errors are turned into MCP error responses (never throw raw exceptions to the host)
- [ ] You log `correlationId` on every request/response for debugging
- [ ] You respect `Retry-After` on 429
- [ ] You have a "dry run" / "explain only" mode for demos that doesn't consume tenant budget
- [ ] Your tool descriptions contain the standard "educational use only, not financial advice" disclaimer

---

## Multi-Turn & Context Strategy

The Rental AI chat endpoint is **stateless** between calls. All context (portfolio snapshot, previous strategy jobs, bias) is either:

- Carried by the tenant's `rentalProfile` + sample portfolio, or
- Explicitly passed via `portfolioId` or `jobId` references

If your agent framework keeps long conversation history, you can:

1. Send the last N turns as part of the `message` (or a `history` array if the API later supports it), or
2. Let the server rely on its own RAG + the injected workspace snapshot (recommended for most tenants).

The current design favors the second approach for cost and consistency.

---

## Testing Your MCP Server

- Use the curl examples in `examples/README.md` to verify raw HTTP behavior first.
- Then point your MCP server at the same key.
- Test both JSON and SSE chat paths.
- Test the full "create → poll until done" loop for strategy.
- Verify that `budget_exhausted` and `scope_error` are correctly surfaced.

---

## When the Contract Changes

The static `openapi/rental-ai.yaml` in this repo is a **pinned mirror**. When the private platform ships a new capability under the `rental-ai` tag:

1. The private team updates the live OpenAPI.
2. This public repo is synced (see `AGENTS.md`).
3. You (as an MCP author) will see a new version tag + CHANGELOG entry.

Subscribe to releases of this repo or poll the live OpenAPI periodically if you want to auto-generate tool schemas.

---

## Support & Feedback

- Integration questions → GitHub Issues on this repo (label: `mcp-integration`)
- Production incidents / key problems → your aTx Finance support contact
- Feature requests for the Rental AI surface → route through your tenant administrator into the private platform backlog

**Good luck building. The tenants you serve will appreciate clean, respectful, low-friction access to the advisor.**
