# Cloudflare Workers deployment

M238 is deployed to Cloudflare Workers as the Vercel replacement. The Worker
uses the production Google Sheets tabs through `VERCEL_ENV=production` in
`wrangler.jsonc`.

## Required runtime secrets

Set these with Wrangler before the first production deploy:

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put DASHBOARD_AUTH_SECRET
```

Optional secrets used by specific features:

```bash
npx wrangler secret put DASHBOARD_LOGIN_PASSWORD
npx wrangler secret put ADMIN_PASSCODE
npx wrangler secret put CLOUDCONVERT_API_KEY
```

The first two must match the same Google service account used by the current production dashboard. Do not commit secret values.

## Deploy

Authenticate once:

```bash
npx wrangler login
```

Then verify and deploy:

```bash
npm ci
npm run cloudflare:check
npm run cloudflare:deploy
```

## Automatic deploy from GitHub

In Cloudflare Workers & Pages, open the Worker and use **Settings > Builds**:

- Repository: `ramadhandwimas/digimap-sales-dashboard`
- Production branch: `preview/monthly-exchange-archive`
- Build command: `npm run cloudflare:build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

Keep the three required secrets above in **Settings > Variables and Secrets**.
Every push to the selected branch will then build and deploy automatically.

Worker hostname:

```
https://m238-digimap-pim2-dashboard.<your-workers-subdomain>.workers.dev
```

Vercel configuration is intentionally left unchanged so it remains available
as a fallback after the account restriction is resolved.
