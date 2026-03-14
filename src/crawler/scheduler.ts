import { redis } from "@/lib/redis";
import { getActiveSources, type CrawlSource } from "./sources";

const LAST_CRAWL_PREFIX = "crawler:last_crawl:";
const CRAWL_LOCK_PREFIX = "crawler:lock:";

/**
 * 지금 크롤링해야 할 소스 목록 반환
 * 마지막 크롤링 시각 + 간격을 기준으로 판단
 */
export async function getDueSources(): Promise<CrawlSource[]> {
  const sources = getActiveSources();
  const dueSources: CrawlSource[] = [];
  const now = Date.now();

  for (const source of sources) {
    const lastCrawl = await redis.get(`${LAST_CRAWL_PREFIX}${source.name}`);
    const lastCrawlTime = lastCrawl ? Number(lastCrawl) : 0;
    const intervalMs = source.intervalMinutes * 60 * 1000;

    if (now - lastCrawlTime >= intervalMs) {
      dueSources.push(source);
    }
  }

  return dueSources;
}

/**
 * 소스의 마지막 크롤링 시각 업데이트
 */
export async function markCrawled(sourceName: string): Promise<void> {
  await redis.set(`${LAST_CRAWL_PREFIX}${sourceName}`, Date.now().toString());
}

/**
 * 도메인별 Rate Limiter
 * 같은 도메인에 대해 최소 간격을 보장
 */
export async function acquireDomainLock(
  domain: string,
  lockDurationMs: number = 3000
): Promise<boolean> {
  const lockKey = `${CRAWL_LOCK_PREFIX}${domain}`;
  // NX: 키가 없을 때만 설정, PX: 밀리초 만료
  const result = await redis.set(lockKey, "1", { nx: true, px: lockDurationMs });
  return result === "OK";
}

/**
 * 모든 서비스가 비활성인지 확인
 */
export async function shouldStopCrawling(apiBaseUrl: string, adminKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/services`, {
      headers: { "x-api-key": adminKey },
    });
    const data = await response.json();
    
    if (!data.services || data.services.length === 0) return false;
    return data.services.every((s: { active: number }) => s.active === 0);
  } catch {
    return false;
  }
}

/**
 * 크롤러 스케줄러 상태 조회
 */
export async function getSchedulerStatus(): Promise<{
  sources: { name: string; lastCrawl: number | null; nextDue: number }[];
}> {
  const sources = getActiveSources();
  const status = [];

  for (const source of sources) {
    const lastCrawl = await redis.get(`${LAST_CRAWL_PREFIX}${source.name}`);
    const lastCrawlTime = lastCrawl ? Number(lastCrawl) : null;
    const intervalMs = source.intervalMinutes * 60 * 1000;
    const nextDue = lastCrawlTime ? lastCrawlTime + intervalMs : 0;

    status.push({
      name: source.name,
      lastCrawl: lastCrawlTime,
      nextDue,
    });
  }

  return { sources: status };
}
