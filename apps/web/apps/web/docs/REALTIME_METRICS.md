# Real-time Metrics over HTTPS

To ensure the homepage metrics update in real time without browser mixed-content errors, serve backend APIs through the SAME origin (domain/IP) as the web over HTTPS.

## Why this is needed

When your site is loaded over HTTPS, the browser blocks `http://` API calls (mixed content). The fix is to expose a reverse proxy at paths like `/api` and `/rpc/...` on your HTTPS web server so the frontend calls stay same-origin.

## Recommended Nginx Locations (HTTPS)

Add the following `location` blocks inside your active HTTPS server in Nginx (the one serving `/usr/share/nginx/html`):

```
# Explorer API (port 3001 on the VPS)
location /api/ {
  proxy_pass http://YOUR_VPS_IP:3001/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# Validator RPC (EU)
location = /rpc/eu {
  proxy_pass http://217.216.109.5:8545;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
}

# Validator RPC (AU)
location = /rpc/au {
  proxy_pass http://46.250.244.4:8545;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
}
```

Then reload nginx:

```
nginx -t && nginx -s reload
```

If your web runs inside a Docker container, copy a conf snippet into `/etc/nginx/conf.d/` and reload inside the container:

```
docker cp live-metrics.conf axionax-nginx:/etc/nginx/conf.d/
docker exec axionax-nginx nginx -t
docker exec axionax-nginx nginx -s reload
```

> Note: The snippet must contain only `location` blocks inside the already active `server` for HTTPS. If you don't control that server block, update the main server conf instead of creating a new one.

## Frontend Configuration

The component `src/components/home/Statistics.tsx` calls:

- Explorer API via `NEXT_PUBLIC_EXPLORER_API` (defaults to same-origin `/api`). If unset, it will also try `NEXT_PUBLIC_API_URL` with `/stats` or `/api/stats`.
- Validator RPC via `NEXT_PUBLIC_RPC_EU` and `NEXT_PUBLIC_RPC_AU` (default `/rpc/eu`, `/rpc/au`). If both are unset, it falls back to `NEXT_PUBLIC_RPC_URL`.
- Polling interval via `NEXT_PUBLIC_REFETCH_MS` (default `5000`).

Set these in `.env` if you need to override defaults (must be HTTPS in production if you set full URLs), otherwise leave them empty to use same-origin proxies:

```
NEXT_PUBLIC_EXPLORER_API=
NEXT_PUBLIC_RPC_EU=/rpc/eu
NEXT_PUBLIC_RPC_AU=/rpc/au
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_REFETCH_MS=5000
```

## Verify

- Load the site over HTTPS
- Open DevTools > Network and confirm `/api/stats` and `/rpc/*` calls succeed (status 200) every 5s
- Home metrics should update without showing `...` placeholders

### Troubleshooting

- Still seeing `...`? Ensure `/api/stats` returns JSON and `/rpc/*` responds to `eth_blockNumber`.
- If you must use external domains, they must be HTTPS and allow CORS (browser-side fetch).
- Mixed content in console means a `http://` endpoint was hit on an `https://` page—use same-origin proxies or switch to HTTPS endpoints.
