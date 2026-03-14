/**
 * 로컬 메모리 캐시 (Upstash Redis 대체)
 * 나중에 Upstash로 교체 가능
 */

const cache = new Map<string, { value: string; expiresAt?: number }>();

export const redis = {
  async get(key: string): Promise<string | null> {
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(
    key: string,
    value: string,
    options?: { nx?: boolean; px?: number }
  ): Promise<string | null> {
    if (options?.nx && cache.has(key)) {
      const existing = cache.get(key)!;
      if (!existing.expiresAt || Date.now() < existing.expiresAt) {
        return null;
      }
    }
    const expiresAt = options?.px ? Date.now() + options.px : undefined;
    cache.set(key, { value, expiresAt });
    return "OK";
  },

  async getbit(key: string, offset: number): Promise<number> {
    const entry = cache.get(`${key}:${offset}`);
    return entry ? Number(entry.value) : 0;
  },

  async setbit(key: string, offset: number, value: number): Promise<number> {
    const prev = await this.getbit(key, offset);
    cache.set(`${key}:${offset}`, { value: String(value) });
    return prev;
  },

  async del(key: string): Promise<number> {
    return cache.delete(key) ? 1 : 0;
  },

  // 캐시 통계 (디버그용)
  size(): number {
    return cache.size;
  },

  clear(): void {
    cache.clear();
  },
};
