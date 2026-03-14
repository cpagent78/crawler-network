import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { crawlers, submissions, adoptions, rewards, services, crawlerStats } from "@/db/schema";
import { eq, count, sum, desc, sql, and, gte } from "drizzle-orm";
import { authenticate } from "@/lib/auth";

// GET /api/dashboard — 모니터링 대시보드 데이터
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.type !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. 전체 통계
    const [totalSubmissions] = await db
      .select({ count: count() })
      .from(submissions);

    const [totalAdoptions] = await db
      .select({ count: count() })
      .from(adoptions);

    const [totalRewards] = await db
      .select({ total: sum(rewards.amount) })
      .from(rewards);

    const [activeCrawlers] = await db
      .select({ count: count() })
      .from(crawlers)
      .where(eq(crawlers.status, "active"));

    // 2. 오늘 통계
    const [todaySubmissions] = await db
      .select({ count: count() })
      .from(submissions)
      .where(gte(submissions.createdAt, today));

    const [todayAdoptions] = await db
      .select({ count: count() })
      .from(adoptions)
      .where(gte(adoptions.adoptedAt, today));

    // 3. 상태별 submission 수
    const statusCounts = await db
      .select({
        status: submissions.status,
        count: count(),
      })
      .from(submissions)
      .groupBy(submissions.status);

    // 4. 크롤러별 성과
    const crawlerPerformance = await db
      .select({
        crawlerId: crawlers.id,
        name: crawlers.name,
        version: crawlers.currentVersion,
        status: crawlers.status,
        submissionCount: count(submissions.id),
      })
      .from(crawlers)
      .leftJoin(submissions, eq(crawlers.id, submissions.crawlerId))
      .groupBy(crawlers.id, crawlers.name, crawlers.currentVersion, crawlers.status)
      .orderBy(desc(count(submissions.id)));

    // 5. 소스 사이트별 통계 (최근 7일)
    const sourceSiteStats = await db
      .select({
        sourceSite: submissions.sourceSite,
        count: count(),
      })
      .from(submissions)
      .where(gte(submissions.createdAt, last7d))
      .groupBy(submissions.sourceSite)
      .orderBy(desc(count()));

    // 6. 서비스 상태
    const serviceStatus = await db
      .select({
        id: services.id,
        name: services.name,
        displayName: services.displayName,
        dailyLimit: services.dailyLimit,
        todayCount: services.todayCount,
        active: services.active,
      })
      .from(services);

    // 7. 최근 채택 내역 (최근 10건)
    const recentAdoptions = await db
      .select({
        submissionId: adoptions.submissionId,
        service: adoptions.service,
        pageUrl: adoptions.pageUrl,
        adoptedAt: adoptions.adoptedAt,
        title: submissions.title,
        sourceSite: submissions.sourceSite,
      })
      .from(adoptions)
      .leftJoin(submissions, eq(adoptions.submissionId, submissions.id))
      .orderBy(desc(adoptions.adoptedAt))
      .limit(10);

    // 8. 최근 보상 (최근 10건)
    const recentRewards = await db
      .select({
        crawlerId: rewards.crawlerId,
        type: rewards.type,
        service: rewards.service,
        amount: rewards.amount,
        reason: rewards.reason,
        createdAt: rewards.createdAt,
      })
      .from(rewards)
      .orderBy(desc(rewards.createdAt))
      .limit(10);

    return NextResponse.json({
      overview: {
        totalSubmissions: totalSubmissions.count,
        totalAdoptions: totalAdoptions.count,
        totalRewards: Number(totalRewards.total) || 0,
        activeCrawlers: activeCrawlers.count,
        adoptionRate:
          totalSubmissions.count > 0
            ? ((totalAdoptions.count / totalSubmissions.count) * 100).toFixed(1)
            : "0",
      },
      today: {
        submissions: todaySubmissions.count,
        adoptions: todayAdoptions.count,
      },
      statusCounts,
      crawlerPerformance,
      sourceSiteStats,
      serviceStatus,
      recentAdoptions,
      recentRewards,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
