# AGENTS Runbook — xFinance Rental AI Public Handoff

**Scope:** This repo is the **public documentation + spec surface** for the aTx Finance Rental AI (white-label) API. It is the first stop for partners, MCP tool authors, and LLM crawlers.

**Private implementation source of truth:** `atx-trusted-advisor` monorepo (`atx-docs/MCP-AI-ADVISOR.md`, `sre-ops/rental-ai-platform.md`, route handlers, OpenAPI generator).

**Goal of this repo:** Make it trivial for an external developer to build a high-quality MCP server or agent integration against the Rental AI endpoints **without** needing private repo access for 90% of integration work.

---

## Standard Local Flow (Contributors / Agents)

1. Clone this repo.
2. (Recommended) `cp .env.example .env` if you add one later; for now most work is docs-only.
3. `npm install` (brings in OpenAPI validator + any future doc tools).
4. `npm test` — validates that `openapi/rental-ai.yaml` is a well-formed OpenAPI 3.1 document and basic markdown structure is intact.
5. Make changes to README, `docs/`, `examples/`, or the static OpenAPI mirror.
6. Run `npm test` again before committing.
7. Open PR. CI will run the same gate.

**No Mongo, no backend, no Docker required** for 99% of work here.

---

## Sync Workflow (Maintainers Only)

When the Rental AI surface changes in the private monorepo:

1. **Verify live contract**
   ```bash
   curl -sS https://fintech-advisor.ai/api/openapi \
     | jq '.paths | keys | map(select(startswith("/api/ai/rent")))'
   ```

2. **Regenerate or hand-edit the static mirror**
   - Preferred: Use the private monorepo's OpenAPI generator and filter to the `rental-ai` tag.
   - Or manually diff the live document against `openapi/rental-ai.yaml`.
   - Update `info.version` (patch for description-only, minor for new paths/scopes).

3. **Update machine indexes**
   - `llm.txt` — short, high-signal, for LLM context windows.
   - `llms.txt` — llms.txt.org style entry.

4. **Update human docs**
   - `README.md` (primary MCP implementer guide)
   - `docs/mcp-implementation-guide.md`
   - `examples/README.md`
   - `CHANGELOG.md` (add entry under Unreleased or new version)

5. **Run validation**
   ```bash
   npm test
   ```

6. **Tag & release** (optional but recommended for partners who pin the handoff version)
   ```bash
   git tag v1.1.x
   git push origin v1.1.x
   ```

**Never** commit real `atxr_*` keys, even in tests or examples. All examples must use placeholder tokens and clear "replace with your key" instructions.

---

## Validation Gates

- `npm test` (OpenAPI parse + basic structure)
- Future: `npm run lint:md`, link checker, spectral rules (add when pain is felt)
- PR description should reference the private monorepo PR or commit that motivated the sync when applicable.

---

## Terminology (use consistently)

- **Rental AI** or **Rental API** — the white-label HTTP surface (`/api/ai/rent/*`)
- **Handoff docs / public surface** — this repository (`xfinance-advisor-mcp`)
- **MCP tool author / integrator** — primary audience for README + docs/mcp-*
- **Tenant** — a paying partner with a `rentalProfile` and one or more `atxr_*` keys
- **strategyBias** — conservative | balanced | aggressive (injected by the server)
- **Metering headers** — `x-rental-tokens-used`, `x-rental-tokens-remaining`

---

## Important Files & Their Purpose

| File | Audience | Purpose |
|------|----------|---------|
| `README.md` | Everyone (first read) | Self-contained MCP integration guide + quickstarts |
| `docs/mcp-implementation-guide.md` | MCP builders | Deep patterns, streaming, polling, error handling, reference code |
| `AGENTS.md` | Agents + maintainers | This runbook |
| `llm.txt` | LLM context / RAG | Ultra-dense machine-readable summary |
| `llms.txt` | llms.txt crawlers | Standard llms.txt entry |
| `openapi/rental-ai.yaml` | Tool generators | Stable, versioned OpenAPI 3.1 snapshot (rental-ai tag only) |
| `examples/` | Copy-paste users | curl + reference MCP server |
| `CHANGELOG.md` | All | Version history of the handoff surface |

---

## Project Cursor / Grok Skills (when working inside this repo)

- Use the project-scoped `.grok/config.toml` (GitHub + filesystem).
- Prefer the global skill set + any skills you have for "documentation" or "public API surface" work.
- When editing the MCP guide or examples, run the validation gate before suggesting the change.

---

## Gotchas

- The live OpenAPI at `/api/openapi` is the source of truth. The file in this repo is a **stable mirror** for GitHub Pages, LLM ingestion, and partners who want a pinned contract.
- SSE streaming uses standard OpenAI `chat.completion.chunk` delta shape + `[DONE]`.
- Job polling (`strategy` / `analyze`) currently returns immediately in MVP; future versions may become long-running.
- Token budgets are per-tenant per-UTC-day. Clients should surface the metering headers to users.

---

## Release Checklist (before tagging vX.Y.Z)

- [ ] `npm test` passes
- [ ] CHANGELOG.md updated with clear "Added / Changed / Fixed"
- [ ] Version bumped in `llm.txt`, README header, and any "current version" callouts
- [ ] `openapi/rental-ai.yaml` `info.version` bumped if the contract description changed
- [ ] All examples still run with a placeholder key (no real secrets)
- [ ] README and mcp guide still read well end-to-end for a new integrator

**Ship it.**
