# xFinance Rental AI — public MCP & agent handoff

**aTx Finance** white-label, tenant-isolated **Rental AI** HTTP API: Grok-backed chat (JSON or SSE), async **strategy** and **analyze** jobs with polling. Use this repo as the **public landing** for partners, LLM crawlers, and MCP tool authors.

**Public product site:** [aTx Trusted Advisory](https://atx.fintech-advisor.ai/) — same deployment hosts the **Next.js** API under `https://atx.fintech-advisor.ai`.

| Resource | Purpose |
|----------|---------|
| [`llm.txt`](llm.txt) | Short machine-readable index (endpoints, auth, scopes) |
| [`llms.txt`](llms.txt) | [llms.txt](https://llmstxt.org/) style entry → README + OpenAPI |
| [`openapi/rental-ai.yaml`](openapi/rental-ai.yaml) | OpenAPI **3.1** export, **`rental-ai`** paths only |
| [`examples/`](examples/) | curl quickstarts |

**Tagline context:** Options-aware advisor surface — “No Atoms Moved. Just Gains Earned.” (brand details in the core product, not duplicated here.)

---

## Implementation source (private monorepo)

All runtime behavior, metering, personas, and the **generated** OpenAPI inventory live in the private **xfinance core** monorepo:

| | |
|--|--|
| **Repository** | `atx-trusted-advisor` (private) |
| **Typical local path** | `/Users/samperez/workspace/atx-trusted-advisor` |
| **Handoff doc** | `atx-docs/MCP-AI-ADVISOR.md` |
| **Monorepo LLM index** | `llm.txt` (root) |
| **System prompt / bias** | `atx-docs/guides/rental-ai-system-prompt.md` |
| **Ops** | `atx-docs/sre-ops/rental-ai-platform.md` |
| **OpenAPI source** | `src/lib/openapi/current-state.ts`, `current-state-overrides.ts` |

When contracts change in the monorepo, refresh **`openapi/rental-ai.yaml`** here (or treat **live** `GET /api/openapi` as canonical and use this file as a stable mirror for GitHub Pages / static hosting).

---

## API spec (summary)

### Base URL

**Production:** `https://atx.fintech-advisor.ai` — all `/api/*` routes (including rental AI) use this origin. Product home: [atx.fintech-advisor.ai](https://atx.fintech-advisor.ai/).

### Authentication

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer atxr_<16-hex-key-id>_<64-hex-secret>` |

Keys are per-tenant, stored hashed on `core_tenants.apiKeys`. Each key grants one or more scopes: **`chat`**, **`strategy`**, **`analyze`**.

### Endpoints

| Scope | Method | Path | Behavior |
|-------|--------|------|----------|
| `chat` | `POST` | `/api/ai/rent/chat` | Body: `{ message, portfolioId?, stream? }`. **200** JSON or **SSE** (`Accept: text/event-stream` or `"stream": true`). Headers: `x-rental-tokens-used`, `x-rental-tokens-remaining`. |
| `strategy` | `POST` | `/api/ai/rent/strategy` | Body: `{ symbols[], portfolioId?, notes? }`. **202** + `jobId`, `pollUrl`. |
| `strategy` | `GET` | `/api/ai/rent/strategy?jobId=` | Poll job. |
| `analyze` | `POST` | `/api/ai/rent/analyze` | Body: `{ jobId?, deepRun? }`. **202** + poll. |
| `analyze` | `GET` | `/api/ai/rent/analyze?jobId=` | Poll job. |

### Live OpenAPI

**Production:** `GET https://atx.fintech-advisor.ai/api/openapi` — filter documentation by tag **`rental-ai`** (operators may also use Swagger at `/admin/api-docs` when signed in).

### MCP / A2A usage

- Map one MCP tool per HTTP operation (or thin client wrapper).
- **Schemas:** `openapi/rental-ai.yaml` or the live OpenAPI document.
- **System prompt/bias:** see monorepo `atx-docs/guides/rental-ai-system-prompt.md` and `MCP-AI-ADVISOR.md`.

---

## Quickstart

See **[examples/README.md](examples/README.md)** for copy-paste **curl** and environment setup.

---

## Compliance & scope

Educational / not personalized investment advice. **No** trade execution or order routing through this API. Outputs should carry standard disclaimers.

---

## Sync checklist (maintainers)

1. Contract change in `atx-trusted-advisor` → update `openapi/rental-ai.yaml` and **`llm.txt`** if paths or auth change.
2. Prefer verifying against **`GET https://atx.fintech-advisor.ai/api/openapi`** (or your staging origin) before tagging a release of this docs repo.
