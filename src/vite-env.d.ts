/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOCAL_SERVER_URL?: string;
  readonly VITE_GAS_WEBHOOK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
