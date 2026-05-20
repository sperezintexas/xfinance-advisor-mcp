# Changelog — xFinance Rental AI Public Handoff

All notable changes to the public documentation, OpenAPI mirror, examples,
and MCP integration guidance for the aTx Finance Rental AI API.

This repo follows semantic versioning for the **handoff surface** (docs + examples + spec mirror).
The underlying HTTP API contract remains Phase 1 (stable paths + schemas).

---

## [1.1.1] — 2026-05-20

### Changed

- **Canonical domain migration**: Production base URL and all references updated from `atx.fintech-advisor.ai` to `https://fintech-advisor.ai`.
- Updated across the entire public surface:
  - README, examples, docs, AGENTS.md, SECURITY.md
  - `openapi/rental-ai.yaml` (`servers` array + info block)
  - `llm.txt` and `llms.txt` (machine-readable indexes)
- Fully removed legacy `atx.` domain references (clean migration).
- Bumped handoff version to 1.1.1 and OpenAPI `info.version` to 1.0.2 (description/servers change only — no breaking API contract change).

This is primarily a documentation + origin canonicalization release. Existing integrations using the old `atx.` subdomain should update their base URLs.

---

## [1.1.0] — 2026-05-XX

### Added

- **Project-scoped `.grok/config.toml`** — GitHub + scoped filesystem MCP servers for contributors and agents working on the public handoff surface.
- **AGENTS.md** — lightweight runbook aligned with the private monorepo style. Covers sync workflow, validation, release tagging, and agent-friendly instructions.
- **Primary MCP Implementer Guide** — README completely rewritten as the canonical first-stop document for partners and MCP tool authors. Self-contained auth, streaming, job polling, metering header, and error patterns.
- **docs/mcp-implementation-guide.md** — detailed guidance + concrete code examples (TypeScript + Python) for building production-grade MCP servers/clients against the Rental AI endpoints.
- **Expanded examples/** — new `mcp-server/` reference implementation (minimal, copy-paste ready stdio MCP server using the official SDK) plus improved curl quickstarts.
- **Standard open-source hygiene files**: LICENSE (Unlicense + commercial notice), CONTRIBUTING.md, SECURITY.md.
- **GitHub Actions CI** + `package.json` validation gate: OpenAPI 3.1 lint + parse, markdown structure checks, and future link/doc tests.
- `docs/` directory following the private repo's "focused guides" pattern.

### Changed

- `llm.txt` and `llms.txt` polished to be primarily self-describing; private monorepo is now clearly labeled as "implementation source of truth" rather than required reading for basic integration.
- All "Version 1.0 (Phase 1)" references updated to "Handoff v1.1 / API Phase 1".
- `openapi/rental-ai.yaml` `info.version` bumped to 1.0.1 (documentation & description improvements only; no contract change).
- Sync checklist expanded with automated validation commands and contributor workflow.
- `examples/README.md` now includes MCP server example usage.

### Improved

- Onboarding experience for external MCP / A2A / agent developers — no private repo access required for core integration work.
- Consistency with `atx-trusted-advisor` documentation philosophy (clear entry points, runbooks, validation gates, machine-readable indexes).

---

## [1.0.0] — Initial public release

- First publication of the Rental AI public handoff repo.
- Static OpenAPI export (`rental-ai` tag only).
- Basic README + curl examples.
- `llm.txt` / `llms.txt` for LLM crawlers.
- Pointers to private monorepo `MCP-AI-ADVISOR.md` for full context.
