# Security Policy — xFinance Rental AI Handoff

This repository contains **public documentation and API specifications** for the aTx Finance Rental AI (white-label) HTTP API. It does **not** contain:

- Application source code
- API keys, secrets, or credentials
- Tenant data or PII
- Runtime configuration

## Reporting a Vulnerability

If you discover a security issue in the **Rental AI API behavior**, the **authentication scheme**, rate limiting, metering, or any production endpoint documented here, please report it privately to the aTx Finance security team.

**Preferred channel:** Email `security@fintech-advisor.ai` (or the address listed on https://atx.fintech-advisor.ai/).

Include:
- Description of the issue
- Steps to reproduce (without using real tenant keys if possible)
- Potential impact
- Suggested remediation (optional)

We will acknowledge receipt within 48 hours and aim to provide a timeline for remediation.

## Scope

This policy covers:
- The production API surface at `https://atx.fintech-advisor.ai/api/ai/rent/*`
- The authentication and scoping model (`atxr_*` Bearer keys)
- Token budget, concurrency, and isolation guarantees described in the docs
- Any drift between this public spec and live behavior

It does **not** cover:
- Issues in third-party MCP servers or client wrappers you build using this spec
- Documentation typos or clarity issues (use GitHub Issues instead)
- The private implementation monorepo (report via internal channels)

## Responsible Disclosure

We appreciate responsible disclosure. We will not pursue legal action against researchers who:
- Act in good faith
- Avoid privacy violations, data destruction, or service degradation
- Give us reasonable time to remediate before public disclosure

Thank you for helping keep the Rental AI platform safe for partners and their clients.
