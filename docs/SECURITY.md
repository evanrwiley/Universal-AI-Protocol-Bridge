# Security

UAIPB is zero-storage, not zero-secret. The generated proxy URL contains an encrypted configuration token with upstream credentials.

## Token contents

The encrypted token may contain:

- target provider and Base URL
- upstream API key or AWS credentials
- model mapping and force model settings
- endpoint routing mode

Treat the proxy URL like an API key. Anyone with the full URL can call the configured upstream until you rotate the upstream key or `WORKER_SECRET`.

## Encryption

- Algorithm: AES-GCM via Web Crypto API.
- Key derivation: HKDF SHA-256 from `WORKER_SECRET`.
- IV: random per token.
- Storage: none. The Worker decrypts the token per request.

## Secret rotation

To invalidate every existing proxy URL:

```bash
npx wrangler secret put WORKER_SECRET
npm run deploy
```

To invalidate one route without breaking all tokens, rotate the upstream API key stored in that token.

## Logging guidance

Do not log:

- full proxy URLs
- decrypted configs
- upstream API keys
- Authorization, x-api-key, api-key, or x-goog-api-key headers

Safe logs should prefer:

- request id
- provider id
- endpoint group
- status code
- retry count

## Deployment notes

- Use HTTPS-only Worker routes.
- Restrict access at Cloudflare if the deployment is private.
- Use separate upstream keys per environment.
- Be careful with Ollama or private endpoints: Cloudflare Workers can only reach network addresses available from the Worker runtime.
