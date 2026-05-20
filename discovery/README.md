# MCP Discovery

This directory contains the stable, machine-readable discovery manifest for the **native Rental AI MCP server**.

## Files

- `mcp.json` — The canonical discovery document.

## Live vs Pinned

- **Live (recommended for clients):**  
  `GET https://fintech-advisor.ai/mcp/discovery`

- **Pinned version in this repo:**  
  `discovery/mcp.json` (updated on each handoff release)

The live endpoint is authoritative. The file here is a stable snapshot intended for:

- LLM context / RAG ingestion
- Offline documentation
- Partner code generators
- Version pinning by integrators

## Usage

When adding the Rental AI as a Custom Connector in Grok (or any MCP client), point it at:

```
https://fintech-advisor.ai/mcp
```

Clients can first fetch the discovery document (with or without authentication) to understand available tools, authentication format, and capabilities.

## Relationship to Other Artifacts

| Artifact                  | Purpose                              |
|---------------------------|--------------------------------------|
| `discovery/mcp.json`      | MCP server capabilities & tools      |
| `openapi/rental-ai.yaml`  | HTTP API contract (rental-ai tag)    |
| `llm.txt` / `llms.txt`    | Dense summaries for LLM consumption  |

## Updating

When the native MCP server in `atx-trusted-advisor` gains new tools or changes capabilities, update:

1. The live endpoint in the monorepo
2. This `discovery/mcp.json` file
3. The public handoff documentation (README, etc.)
4. `llm.txt` and `llms.txt` if the high-level description changes

See `AGENTS.md` for the full release process.