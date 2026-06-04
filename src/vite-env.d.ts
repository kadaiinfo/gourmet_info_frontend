/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Zaraz (Cloudflare Analytics) types
declare global {
  interface Window {
    zaraz?: {
      track: (eventName: string, properties?: Record<string, any>) => void;
      set: (key: string, value: any, options?: Record<string, any>) => void;
    };
  }
}
