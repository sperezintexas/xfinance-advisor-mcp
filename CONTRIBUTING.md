# Contributing to xFinance Rental AI Public Handoff

Thank you for helping improve the public documentation, examples, and MCP integration surface for the aTx Finance Rental AI API.

This repository is intentionally small and focused. Its consumers are:
- Investment advisors and partner teams integrating via MCP / A2A / custom agents
- LLM crawlers and indexing systems
- Developers building thin MCP servers or OpenAI-compatible wrappers

## How to Contribute

### 1. Documentation & Examples Improvements (most common)

- Fix unclear language in the MCP implementer guide
- Add better error-handling patterns or polling examples
- Improve the reference MCP server in `examples/mcp-server/`
- Add a new quickstart (e.g., LangChain tool, LlamaIndex, custom agent framework)

**Please keep examples minimal and copy-paste friendly.** Avoid pulling in heavy frameworks unless they are the point of the example.

### 2. OpenAPI / Spec Sync

The canonical source of truth for routes and schemas lives in the private monorepo (`atx-trusted-advisor`).

When the Rental AI surface changes:

1. Run the validation locally: `npm test`
2. Update `openapi/rental-ai.yaml` from the live `GET /api/openapi` (filtered to `rental-ai` tag) or from the private repo's generator.
3. Update `llm.txt` if paths, auth, or scopes changed.
4. Update this `CONTRIBUTING.md`, `README.md`, and `docs/mcp-implementation-guide.md` if behavior notes changed.
5. Bump the handoff version in `CHANGELOG.md` (patch for docs, minor for contract-visible changes).

See `AGENTS.md` → "Sync Workflow" for the exact maintainer steps.

### 3. Pull Request Process

- All PRs must pass CI (`npm test` + any future lint gates).
- Documentation changes should be reviewed for clarity by at least one person who has not worked on the text.
- For any behavioral claim ("the chat endpoint returns X"), prefer linking to a live test or the private repo integration test rather than asserting from memory.
- Never commit real `atxr_*` keys or tenant secrets.

### 4. Code Style (when adding examples)

- TypeScript examples: strict, minimal deps, ESM where possible.
- Python examples: modern (3.10+), type hints, no unnecessary classes.
- All examples must include a clear "how to run" section and a warning that they require a valid rental API key.

## Local Development

```bash
# After cloning
npm install
npm test                 # validates OpenAPI + basic doc structure
```

See `AGENTS.md` for the full agent / maintainer workflow.

## Questions?

Open a GitHub Issue with the label `question` or `mcp-integration`.

For production integration support, use the channels listed in your tenant agreement.
