import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adoptions, submissions, rewards, crawlers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "@/lib/auth";

// POST /api/adoptions — 서비스가 채택/기각 알림
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.type !== "service" && auth.type !== "admin") {
    return NextResponse.json(
      { error: "Only services can create adoptions" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { submissionId, service, status, pageId, pageUrl, reason } = body;

    if (!submissionId || !service || !status) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["submissionId", "service", "status"],
        },
        { status: 400 }
      );
    }

    if (!["adopted", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'adopted' or 'rejected'" },
        { status: 400 }
      );
    }

    // submission 존재 확인
    const [submission] = await db
      .select({
        id: submissions.id,
        crawlerId: submissions.crawlerId,
        crawlerVersion: submissions.crawlerVersion,
        discoveredAt: submissions.discoveredAt,
        publishedAt: submissions.publishedAt,
        content: submissions.content,
      })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // submission 상태 업데이트
    await db
      .update(submissions)
      .set({ status })
      .where(eq(submissions.id, submissionId));

    if (status === "adopted") {
      // 채택 기록 생성
      const [adoption] = await db
        .insert(adoptions)
        .values({
          submissionId,
          service,
          pageId: pageId ?? null,
          pageUrl: pageUrl ?? null,
        })
        .returning({ id: adoptions.id });

      // 1차 보상 계산
      let rewardAmount = 10; // 기본 채택 보상

      // 속도 가산: publishedAt → discoveredAt 차이
      if (submission.publishedAt && submission.discoveredAt) {
        const diffMinutes =
          (submission.discoveredAt.getTime() - submission.publishedAt.getTime()) /
          (1000 * 60);
        if (diffMinutes <= 30) rewardAmount += 10; // 30분 이내 발견
        else if (diffMinutes <= 60) rewardAmount += 5; // 1시간 이내
        else if (diffMinutes <= 180) rewardAmount += 2; // 3시간 이내
      }

      // 콘텐츠 풍부함 가산
      const contentLength = submission.content?.length ?? 0;
      if (contentLength >= 3000) rewardAmount += 5; // 전문
      else if (contentLength >= 1000) rewardAmount += 3; // 충분
      else if (contentLength >= 300) rewardAmount += 1; // 최소

      // 보상 기록 생성
      await db.insert(rewards).values({
        crawlerId: submission.crawlerId,
        crawlerVersion: submission.crawlerVersion,
        submissionId,
        type: "adoption",
        service,
        amount: rewardAmount,
        reason: `채택 (속도+콘텐츠 가산 포함)`,
      });

      return NextResponse.json({
        adoptionId: adoption.id,
        status: "adopted",
        reward: rewardAmount,
      });
    } else {
      // 기각
      return NextResponse.json({
        status: "rejected",
        reason: reason ?? "unknown",
      });
    }
  } catch (error) {
    console.error("Adoption error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
