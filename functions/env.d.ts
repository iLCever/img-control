/**
 * Secrets are configured in the Cloudflare dashboard and are intentionally
 * absent from wrangler.jsonc. Keep their types outside the generated file so
 * `npm run cf-typegen` can safely overwrite worker-configuration.d.ts.
 */
interface Env {
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
}

