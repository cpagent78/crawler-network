import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions, crawlers } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { authenticate } from "@/lib/auth";
import { isUrlSeen, markUrlSeen } from "@/lib/bloom";

// POST /api/submissions — 크롤러가 정보 제출
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.type !== "crawler") {
    return NextResponse.json(
      { error: "Only crawlers can submit" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // 필수 필드 검증
    const { sourceUrl, title, content, discoveredAt, crawlerVersion, sourceSite } = body;
    if (!sourceUrl || !title || !content || !discoveredAt || !crawlerVersion || !sourceSite) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["sourceUrl", "title", "content", "discoveredAt", "crawlerVersion", "sourceSite"],
        },
        { status: 400 }
      );
    }

    // Bloom Filter로 빠른 중복 체크
    if (await isUrlSeen(sourceUrl)) {
      return NextResponse.json({
        submissionId: null,
        status: "duplicate",
        reason: "duplicate_source_url",
      });
    }

    // DB에 저장
    const [submission] = await db
      .insert(submissions)
      .values({
        crawlerId: auth.id!,
        crawlerVersion,
        sourceUrl,
        sourceSite,
        title,
        content,
        discoveredAt: new Date(discoveredAt),
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
        viewCount: body.viewCount ?? null,
        imageUrls: body.imageUrls ?? null,
        language: body.language ?? null,
        tags: body.tags ?? null,
      })
      .returning({ id: submissions.id })
      .onConflictDoNothing({ target: submissions.sourceUrl });

    // UNIQUE 제약에 걸린 경우 (Bloom Filter 미스)
    if (!submission) {
      await markUrlSeen(sourceUrl);
      return NextResponse.json({
        submissionId: null,
        status: "duplicate",
        reason: "duplicate_source_url",
      });
    }

    // Bloom Filter에 등록
    await markUrlSeen(sourceUrl);

    // TODO: webhook으로 활성 서비스에 알림 (Phase 2)

    return NextResponse.json({
      submissionId: submission.id,
      status: "accepted",
      reason: null,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/submissions — 서비스가 검토할 정보 조회
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.type !== "service" && auth.type !== "admin") {
    return NextResponse.json(
      { error: "Only services can view submissions" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "pending";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const since = searchParams.get("since");
    const sourceSite = searchParams.get("sourceSite");
    const language = searchParams.get("language");

    // 필터 조건 구성
    const conditions = [eq(submissions.status, status as "pending" | "adopted" | "rejected")];

    if (since) {
      conditions.push(gte(submissions.createdAt, new Date(since)));
    }
    if (sourceSite) {
      conditions.push(eq(submissions.sourceSite, sourceSite));
    }
    if (language) {
      conditions.push(eq(submissions.language, language));
    }

    const results = await db
      .select()
      .from(submissions)
      .where(and(...conditions))
      .orderBy(desc(submissions.createdAt))
      .limit(limit);

    return NextResponse.json({
      submissions: results,
      total: results.length,
      hasMore: results.length === limit,
    });
  } catch (error) {
    console.error("Submissions fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
