import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { performance, adoptions, rewards, submissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "@/lib/auth";

// POST /api/performance — 서비스가 성과 데이터 전달
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.type !== "service" && auth.type !== "admin") {
    return NextResponse.json(
      { error: "Only services can submit performance data" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { service, pageId, period, metrics } = body;

    if (!service || !pageId || !period || !metrics) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["service", "pageId", "period", "metrics"],
        },
        { status: 400 }
      );
    }

    // 성과 기록 저장
    const [perf] = await db
      .insert(performance)
      .values({
        pageId,
        service,
        period,
        visitors: metrics.visitors ?? 0,
        clicks: metrics.clicks ?? 0,
        conversions: metrics.conversions ?? 0,
        engagementScore: metrics.avgTimeOnPage ?? 0,
      })
      .returning({ id: performance.id });

    // 해당 pageId의 adoption 찾기 → 크롤러에 2차 보상
    const [adoption] = await db
      .select({
        submissionId: adoptions.submissionId,
      })
      .from(adoptions)
      .where(eq(adoptions.pageId, pageId))
      .limit(1);

    if (adoption) {
      const [submission] = await db
        .select({
          crawlerId: submissions.crawlerId,
          crawlerVersion: submissions.crawlerVersion,
        })
        .from(submissions)
        .where(eq(submissions.id, adoption.submissionId))
        .limit(1);

      if (submission) {
        // 2차 보상 계산 (방문자 기반)
        const visitors = metrics.visitors ?? 0;
        let rewardAmount = 0;

        if (visitors >= 50000) rewardAmount = 50;
        else if (visitors >= 10000) rewardAmount = 30;
        else if (visitors >= 1000) rewardAmount = 15;
        else if (visitors >= 100) rewardAmount = 5;

        if (rewardAmount > 0) {
          await db.insert(rewards).values({
            crawlerId: submission.crawlerId,
            crawlerVersion: submission.crawlerVersion,
            submissionId: adoption.submissionId,
            type: "performance",
            service,
            amount: rewardAmount,
            reason: `성과 보상: ${period} 방문자 ${visitors}명`,
          });
        }

        return NextResponse.json({
          performanceId: perf.id,
          status: "recorded",
          reward: rewardAmount,
        });
      }
    }

    return NextResponse.json({
      performanceId: perf.id,
      status: "recorded",
      reward: 0,
      note: "No linked adoption found for this pageId",
    });
  } catch (error) {
    console.error("Performance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
