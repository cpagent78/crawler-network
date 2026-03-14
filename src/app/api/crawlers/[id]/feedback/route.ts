import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions, adoptions } from "@/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { authenticate } from "@/lib/auth";

// GET /api/crawlers/[id]/feedback — 크롤러 채택/기각 결과 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  if (auth.type === "crawler" && auth.id !== id) {
    return NextResponse.json(
      { error: "Can only view own feedback" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    // 처리된 submission들 조회
    const processed = await db
      .select({
        id: submissions.id,
        sourceUrl: submissions.sourceUrl,
        sourceSite: submissions.sourceSite,
        title: submissions.title,
        status: submissions.status,
        crawlerVersion: submissions.crawlerVersion,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.crawlerId, id),
          ne(submissions.status, "pending")
        )
      )
      .orderBy(desc(submissions.createdAt))
      .limit(limit);

    // 채택된 건에 대해 adoption 정보 추가
    const feedback = await Promise.all(
      processed.map(async (sub) => {
        if (sub.status === "adopted") {
          const [adoption] = await db
            .select({
              service: adoptions.service,
              pageId: adoptions.pageId,
              pageUrl: adoptions.pageUrl,
              adoptedAt: adoptions.adoptedAt,
            })
            .from(adoptions)
            .where(eq(adoptions.submissionId, sub.id))
            .limit(1);

          return { ...sub, adoption: adoption ?? null };
        }
        return { ...sub, adoption: null };
      })
    );

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
