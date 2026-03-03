interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

class MemoryCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private defaultTtl: number;

  constructor(ttlMs: number = DEFAULT_TTL) {
    this.defaultTtl = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtl),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Singleton caches for different data types
export const stockCache = new MemoryCache<Record<string, unknown>>(DEFAULT_TTL);
export const searchCache = new MemoryCache<Record<string, unknown>[]>(60 * 60 * 1000); // 1 hour

export { MemoryCache };
