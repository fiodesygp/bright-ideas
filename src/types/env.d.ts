/** Short commit id of the build, or "dev". Set in vite.config.ts. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Full URL of the sync endpoint. Leave unset to use /api/sync on the same site (Vercel). */
  readonly VITE_SYNC_URL?: string
}
