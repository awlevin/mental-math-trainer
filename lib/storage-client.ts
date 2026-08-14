// Installs the window.storage async key-value API the trainer component
// expects, backed by the authenticated /api/storage routes.
//
// One-time legacy import: if the server has no value for a key but this
// browser's localStorage does (either the bare key or an "mmt:"-prefixed
// variant from the old artifact build), the local value is uploaded so old
// stats carry over.

type StorageRecord = { key: string; value: string };

interface CloudStorage {
  get(key: string): Promise<StorageRecord | null>;
  set(key: string, value: string): Promise<StorageRecord>;
  delete(key: string): Promise<void>;
  list(): Promise<{ keys: string[] }>;
}

declare global {
  interface Window {
    storage?: CloudStorage & { __mmtCloud?: boolean };
  }
}

const LEGACY_PREFIX = "mmt:";

function endpoint(key: string) {
  return `/api/storage/${encodeURIComponent(key)}`;
}

function readLegacyLocal(key: string): string | null {
  try {
    return (
      window.localStorage.getItem(LEGACY_PREFIX + key) ??
      window.localStorage.getItem(key)
    );
  } catch {
    return null;
  }
}

export function installStorage() {
  if (typeof window === "undefined") return;
  if (window.storage?.__mmtCloud) return;

  const storage: CloudStorage & { __mmtCloud: boolean } = {
    __mmtCloud: true,

    async get(key) {
      const res = await fetch(endpoint(key));
      if (res.status === 404) {
        const legacy = readLegacyLocal(key);
        if (legacy != null) {
          await this.set(key, legacy);
          return { key, value: legacy };
        }
        return null;
      }
      if (!res.ok) throw new Error(`storage.get(${key}) failed: ${res.status}`);
      return res.json();
    },

    async set(key, value) {
      const res = await fetch(endpoint(key), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error(`storage.set(${key}) failed: ${res.status}`);
      return res.json();
    },

    async delete(key) {
      const res = await fetch(endpoint(key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        throw new Error(`storage.delete(${key}) failed: ${res.status}`);
      }
    },

    async list() {
      const res = await fetch("/api/storage");
      if (!res.ok) throw new Error(`storage.list() failed: ${res.status}`);
      return res.json();
    },
  };

  window.storage = storage;
}
