/**
 * 크롤러 실행기 — Mac Mini에서 실행
 * 
 * 사용법: npx tsx src/crawler/runner.ts
 * 
 * 환경변수 필요:
 * - API_BASE_URL: 크롤러 시스템 API 주소
 * - CRAWLER_API_KEY: 크롤러 API 키
 * - ADMIN_API_KEY: 서비스 상태 확인용
 * - CRAWLER_VERSION: 크롤러 버전
 */

import { getDueSources, markCrawled, acquireDomainLock, shouldStopCrawling } from "./scheduler";
import { crawlSource, extractDomain, delay } from "./engine";
import type { CrawlResult } from "./engine";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const CRAWLER_API_KEY = process.env.CRAWLER_API_KEY ?? "";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";
const CRAWLER_VERSION = process.env.CRAWLER_VERSION ?? "v1.0";
const CHECK_INTERVAL = 60 * 1000; // 1분마다 스케줄 체크

/**
 * 수집한 정보를 크롤러 시스템에 제출
 */
async function submitResult(result: CrawlResult): Promise<{
  submissionId: string | null;
  status: string;
  reason: string | null;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CRAWLER_API_KEY,
      },
      body: JSON.stringify({
        crawlerVersion: CRAWLER_VERSION,
        sourceUrl: result.sourceUrl,
        sourceSite: result.sourceSite,
        title: result.title,
        content: result.content,
        discoveredAt: new Date().toISOString(),
        publishedAt: result.publishedAt,
        viewCount: result.viewCount,
        imageUrls: result.imageUrls,
        language: result.language,
        tags: result.tags,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error("Submit error:", error);
    return { submissionId: null, status: "error", reason: "network_error" };
  }
}

/**
 * 보상 내역 조회 (학습용)
 */
async function fetchRewards(crawlerId: string): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/crawlers/${crawlerId}/rewards?limit=20`,
      {
        headers: { "x-api-key": CRAWLER_API_KEY },
      }
    );
    const data = await response.json();
    
    if (data.rewards && data.rewards.length > 0) {
      console.log(`\n📊 최근 보상 현황:`);
      let totalReward = 0;
      const sourceCounts: Record<string, { count: number; reward: number }> = {};

      for (const reward of data.rewards) {
        totalReward += reward.amount;
        const site = reward.sourceSite ?? "unknown";
        if (!sourceCounts[site]) {
          sourceCounts[site] = { count: 0, reward: 0 };
        }
        sourceCounts[site].count++;
        sourceCounts[site].reward += reward.amount;
      }

      console.log(`  총 보상: ${totalReward}점`);
      console.log(`  소스별:`);
      for (const [site, stats] of Object.entries(sourceCounts)) {
        console.log(`    ${site}: ${stats.count}건, ${stats.reward}점`);
      }
    }
  } catch {
    // 보상 조회 실패해도 크롤링은 계속
  }
}

/**
 * 메인 크롤링 루프
 */
async function runCrawlCycle(): Promise<void> {
  console.log(`\n🕷️ [${new Date().toISOString()}] 크롤링 사이클 시작`);

  // 서비스 상태 확인
  if (await shouldStopCrawling(API_BASE_URL, ADMIN_API_KEY)) {
    console.log("⏸️  모든 서비스 비활성 — 크롤링 일시 중지");
    return;
  }

  // 크롤링할 소스 확인
  const dueSources = await getDueSources();
  if (dueSources.length === 0) {
    console.log("⏳ 크롤링 대기 중 — 아직 간격이 안 됨");
    return;
  }

  console.log(`📋 크롤링 대상: ${dueSources.map((s) => s.name).join(", ")}`);

  let totalSubmitted = 0;
  let totalAccepted = 0;
  let totalDuplicate = 0;

  for (const source of dueSources) {
    const domain = extractDomain(source.url);

    // 도메인 락 확인 (polite crawling)
    const hasLock = await acquireDomainLock(domain, 5000);
    if (!hasLock) {
      console.log(`🔒 ${source.name} — 도메인 락 대기 중, 스킵`);
      continue;
    }

    console.log(`\n🌐 ${source.name} 크롤링 중...`);

    try {
      const results = await crawlSource(source.url, source.maxArticles);
      console.log(`  발견: ${results.length}건`);

      for (const result of results) {
        const response = await submitResult(result);
        totalSubmitted++;

        if (response.status === "accepted") {
          totalAccepted++;
          console.log(`  ✅ 수용: ${result.title.substring(0, 60)}...`);
        } else if (response.status === "duplicate") {
          totalDuplicate++;
        } else {
          console.log(`  ❌ 거부: ${result.title.substring(0, 60)}... (${response.reason})`);
        }
      }

      // 크롤링 완료 마킹
      await markCrawled(source.name);
    } catch (error) {
      console.error(`  ❗ ${source.name} 크롤링 실패:`, error);
    }

    // 소스 간 딜레이
    await delay(2000);
  }

  console.log(`\n📈 사이클 결과: 제출 ${totalSubmitted}건, 수용 ${totalAccepted}건, 중복 ${totalDuplicate}건`);
}

/**
 * 메인 실행
 */
async function main(): Promise<void> {
  console.log("🕷️ 크롤러 네트워크 시작");
  console.log(`  API: ${API_BASE_URL}`);
  console.log(`  버전: ${CRAWLER_VERSION}`);
  console.log(`  체크 간격: ${CHECK_INTERVAL / 1000}초`);
  console.log("");

  // 무한 루프
  while (true) {
    try {
      await runCrawlCycle();
    } catch (error) {
      console.error("크롤링 사이클 에러:", error);
    }

    // 다음 사이클까지 대기
    await delay(CHECK_INTERVAL);
  }
}

// 직접 실행 시
main().catch(console.error);
