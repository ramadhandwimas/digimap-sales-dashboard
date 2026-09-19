# Cloudflare Workers temporary deployment

M238 can be deployed temporarily to Cloudflare Workers without changing the Vercel setup.

## Required runtime secrets

Set these with Wrangler before the first production deploy:

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put DASHBOARD_AUTH_SECRET
```

The first two must match the same Google service account used by the current production dashboard. Do not commit secret values.

## Deploy

Authenticate once:

```bash
npx wrangler login
```

Then:

```bash
npm ci
npm run cloudflare:check
npm run cloudflare:deploy
```

Expected temporary Worker hostname:

```
https://m238-digimap-pim2-dashboard.<your-workers-subdomain>.workers.dev
```

Vercel configuration is intentionally left unchanged so the project can move back later.
