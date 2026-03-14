import { redis } from "./redis";

const BLOOM_KEY = "crawler:url:bloom";

/**
 * Check if a URL has already been submitted using Redis-based Bloom filter.
 * Uses multiple hash functions to reduce false positives.
 */
export async function isUrlSeen(url: string): Promise<boolean> {
  const hashes = getHashes(url);
  const results = await Promise.all(
    hashes.map((hash) => redis.getbit(BLOOM_KEY, hash))
  );
  return results.every((bit) => bit === 1);
}

/**
 * Mark a URL as seen in the Bloom filter.
 */
export async function markUrlSeen(url: string): Promise<void> {
  const hashes = getHashes(url);
  await Promise.all(hashes.map((hash) => redis.setbit(BLOOM_KEY, hash, 1)));
}

/**
 * Simple hash functions for Bloom filter.
 * Uses FNV-1a variants with different seeds.
 */
function getHashes(str: string, count = 3, size = 1_000_000): number[] {
  const hashes: number[] = [];
  for (let i = 0; i < count; i++) {
    let hash = 2166136261 + i * 16777619;
    for (let j = 0; j < str.length; j++) {
      hash ^= str.charCodeAt(j);
      hash = (hash * 16777619) >>> 0;
    }
    hashes.push(hash % size);
  }
  return hashes;
}
