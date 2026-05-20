# Rental AI — Remote HTTP MCP Server (Grok-ready)

This package turns the aTx Finance Rental AI into a **publicly reachable MCP server** that you can register as a **Custom Connector** in Grok (including inside Grok Business).

Once registered, your team can ask Grok natural-language questions about options strategies, wheel income, portfolio analysis, etc., and Grok will call your tenant-scoped Rental AI under the hood — with proper token metering.

---

## Why this exists

- The sibling `../mcp-server` is a **stdio** server (great for local tools like Cursor/Claude Desktop).
- This one is an **HTTP** server using the modern Streamable HTTP transport.
- Grok’s Custom Connector UI and the Grok Business “Apps” section (`/grok-business/apps` in console.x.ai) require a remote HTTPS endpoint.

---

## Quick Start (Local)

```bash
cd examples/mcp-server-http

npm install

# Required
export RENTAL_AI_KEY="atxr_...your-tenant-key-with-chat+strategy+analyze..."

# Recommended for any real deployment
export MCP_AUTH_TOKEN="a-long-random-secret-only-you-and-grok-know"

npm run dev
```

The server will be available at:

- `http://localhost:3000/mcp` ← point Grok here
- `http://localhost:3000/health`

---

## Deploy to Production (Recommended Platforms)

### Railway (easiest for most people)

1. Push this folder (or the whole repo) to GitHub.
2. Go to [railway.app](https://railway.app), New Project → Deploy from GitHub.
3. Add the two required environment variables:
   - `RENTAL_AI_KEY`
   - `MCP_AUTH_TOKEN` (generate a strong random string)
4. Railway gives you a public `https://your-app.up.railway.app` URL.

Your final MCP URL will be:

```
https://your-app.up.railway.app/mcp
```

### Other good options

- **Fly.io** (`fly launch` + `fly deploy`)
- **Render** (Web Service)
- **AWS ECS / App Runner**
- **DigitalOcean App Platform**

Any platform that can run a Node 20+ container and give you a stable HTTPS URL works.

> **Important**: Free-tier tunnels (ngrok, cloudflared quick tunnels) are **not** suitable for production use with Grok Business because the URL changes on every restart.

---

## Registering in Grok (the part you actually care about)

### Option A – Quick personal test

1. Go to https://grok.com/connectors
2. **New Connector** → **Custom**
3. Paste your public URL:
   ```
   https://your-app.up.railway.app/mcp
   ```
4. If you set `MCP_AUTH_TOKEN`, enter it in the credentials / authorization field (Grok will send it as `Authorization: Bearer ...`).
5. Grok will discover the five tools and they become available in chat.

### Option B – Team-wide via Grok Business Console

1. Go to the exact page you originally asked about:
   ```
   https://console.x.ai/team/<your-team>/grok-business/apps
   ```
2. Add / publish a new Custom App pointing at the same `/mcp` URL.
3. (If your plan supports it) approve it so the connector appears automatically for everyone in the team.

After registration, team members can simply talk to Grok and say things like:

> “Run a conservative wheel analysis on my NVDA and SPY positions using the rental advisor”

…and Grok will use the `rental_ai_chat` tool (and the others when needed).

---

## Authentication & Security

| Layer                        | Who controls it                  | Recommendation |
|-----------------------------|----------------------------------|--------------|
| `RENTAL_AI_KEY` (atxr_*)    | You (server-side only)           | Never expose. Keep in platform secrets. |
| `MCP_AUTH_TOKEN`            | You (the MCP endpoint guard)     | Set this for any public deployment. |
| Network / URL secrecy       | You                              | Don’t publish the URL in public repos if you want to limit access. |

When Grok calls your server it will include whatever authorization header you configured in the connector settings.

---

## Exposed Tools

Same as the stdio reference:

- `rental_ai_chat`
- `rental_ai_create_strategy` + `rental_ai_get_strategy`
- `rental_ai_create_analyze` + `rental_ai_get_analyze`

See the main [MCP Implementation Guide](../../../docs/mcp-implementation-guide.md) for usage patterns, streaming behavior, and error handling.

---

## Environment Variables

| Variable            | Required | Purpose |
|---------------------|----------|---------|
| `RENTAL_AI_KEY`     | Yes      | Your `atxr_*` tenant key |
| `RENTAL_AI_BASE_URL`| No       | Override for staging |
| `MCP_AUTH_TOKEN`    | No*      | Bearer token that callers must send to `/mcp` |
| `PORT`              | No       | Defaults to 3000 (most PaaS override this) |

\* Strongly recommended once the server is on the public internet.

---

## Development Tips

```bash
npm run dev          # hot reload
npm run build        # compile to dist/
npm start            # run the compiled version
```

Health check (useful for platform readiness probes):

```bash
curl https://your-app.up.railway.app/health
```

---

## Next Steps / Hardening Ideas

- Add request logging + correlation IDs
- Add rate limiting on the MCP endpoint
- Support multiple `RENTAL_AI_KEY`s (keyed by some tenant identifier passed by Grok)
- Add a `rental_ai_get_budget` tool
- Turn this into a small monorepo package that the stdio server can also consume

---

## Related Files in This Repo

- `../mcp-server/` — the local stdio version
- `../../docs/mcp-implementation-guide.md` — deep patterns for production
- `../../openapi/rental-ai.yaml` — the underlying contract

---

You now have everything needed to turn the Rental AI surface into a first-class App inside your Grok Business workspace.

Ship the HTTP server, register the URL in the console, and your team (or customers) get a powerful options-aware advisor without ever leaving Grok.
