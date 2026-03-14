import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rewards, submissions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticate } from "@/lib/auth";

// GET /api/crawlers/[id]/rewards — 크롤러 보상 내역 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // 크롤러는 자기 보상만 조회 가능
  if (auth.type === "crawler" && auth.id !== id) {
    return NextResponse.json(
      { error: "Can only view own rewards" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    const rewardList = await db
      .select({
        id: rewards.id,
        crawlerVersion: rewards.crawlerVersion,
        submissionId: rewards.submissionId,
        type: rewards.type,
        service: rewards.service,
        amount: rewards.amount,
        reason: rewards.reason,
        createdAt: rewards.createdAt,
      })
      .from(rewards)
      .where(eq(rewards.crawlerId, id))
      .orderBy(desc(rewards.createdAt))
      .limit(limit);

    // 보상에 소스 정보 추가
    const enriched = await Promise.all(
      rewardList.map(async (reward) => {
        const [sub] = await db
          .select({
            sourceUrl: submissions.sourceUrl,
            sourceSite: submissions.sourceSite,
            title: submissions.title,
          })
          .from(submissions)
          .where(eq(submissions.id, reward.submissionId))
          .limit(1);

        return {
          ...reward,
          sourceUrl: sub?.sourceUrl ?? null,
          sourceSite: sub?.sourceSite ?? null,
          title: sub?.title ?? null,
        };
      })
    );

    return NextResponse.json({ rewards: enriched });
  } catch (error) {
    console.error("Rewards fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
