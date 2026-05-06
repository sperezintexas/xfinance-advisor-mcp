# Quickstart — Rental AI HTTP API

Set:

```bash
export XFINANCE_ORIGIN="https://atx.fintech-advisor.ai"
export RENTAL_TOKEN="atxr_<16-hex>_<64-hex>"   # chat + strategy + analyze per key
```

Use **only** TLS in production. Override `XFINANCE_ORIGIN` for staging or local dev.

## Chat (JSON)

```bash
curl -sS "${XFINANCE_ORIGIN}/api/ai/rent/chat" \
  -H "Authorization: Bearer ${RENTAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message":"Summarize defined-risk income ideas for a tech-heavy book.","stream":false}' \
  -D /tmp/rental-hdr.txt -o /tmp/rental-body.json

grep -i x-rental /tmp/rental-hdr.txt || true
cat /tmp/rental-body.json
```

## Chat (SSE)

```bash
curl -sS -N "${XFINANCE_ORIGIN}/api/ai/rent/chat" \
  -H "Authorization: Bearer ${RENTAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"message":"One paragraph on wheel vs buy-write for NVDA.","stream":true}'
```

## Strategy job (accept + poll)

```bash
ACC=$(curl -sS -X POST "${XFINANCE_ORIGIN}/api/ai/rent/strategy" \
  -H "Authorization: Bearer ${RENTAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"symbols":["NVDA","SPY"],"notes":"conservative bias"}')

echo "$ACC"
JOB=$(echo "$ACC" | sed -n 's/.*"jobId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
test -n "$JOB"

curl -sS "${XFINANCE_ORIGIN}/api/ai/rent/strategy?jobId=${JOB}" \
  -H "Authorization: Bearer ${RENTAL_TOKEN}"
```

## Analyze job (accept + poll)

```bash
ACC=$(curl -sS -X POST "${XFINANCE_ORIGIN}/api/ai/rent/analyze" \
  -H "Authorization: Bearer ${RENTAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$ACC"
JOB=$(echo "$ACC" | sed -n 's/.*"jobId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
test -n "$JOB"

curl -sS "${XFINANCE_ORIGIN}/api/ai/rent/analyze?jobId=${JOB}" \
  -H "Authorization: Bearer ${RENTAL_TOKEN}"
```

## Fetch live OpenAPI (full inventory)

```bash
curl -sS "${XFINANCE_ORIGIN}/api/openapi" | head -c 2000 && echo ...
```

Filter your viewer or CI for tag **`rental-ai`**.

## Private implementation

Routes and tests: monorepo **`atx-trusted-advisor`** — local path `/Users/samperez/workspace/atx-trusted-advisor`.

Documentation: `atx-docs/MCP-AI-ADVISOR.md`, `atx-docs/sre-ops/rental-ai-platform.md`.
