import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { crawlers, rewards, crawlerStats } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticate } from "@/lib/auth";
import { randomBytes } from "crypto";

// POST /api/crawlers — 크롤러 등록 (Admin only)
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.type !== "admin") {
    return NextResponse.json(
      { error: "Admin only" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, version, strategy } = body;

    if (!name || !version) {
      return NextResponse.json(
        { error: "Missing required fields", required: ["name", "version"] },
        { status: 400 }
      );
    }

    const apiKey = `ck_${randomBytes(24).toString("hex")}`;

    const [crawler] = await db
      .insert(crawlers)
      .values({
        name,
        apiKey,
        currentVersion: version,
        strategy: strategy ?? null,
      })
      .returning();

    return NextResponse.json({
      id: crawler.id,
      name: crawler.name,
      apiKey,
      version: crawler.currentVersion,
      status: crawler.status,
    });
  } catch (error) {
    console.error("Crawler registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/crawlers — 크롤러 목록 조회
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // 크롤러가 자기 정보 조회
    if (auth.type === "crawler") {
      const [crawler] = await db
        .select({
          id: crawlers.id,
          name: crawlers.name,
          currentVersion: crawlers.currentVersion,
          strategy: crawlers.strategy,
          status: crawlers.status,
          createdAt: crawlers.createdAt,
        })
        .from(crawlers)
        .where(eq(crawlers.id, auth.id!))
        .limit(1);

      if (!crawler) {
        return NextResponse.json(
          { error: "Crawler not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(crawler);
    }

    // Admin은 전체 목록
    if (auth.type === "admin") {
      const allCrawlers = await db
        .select({
          id: crawlers.id,
          name: crawlers.name,
          currentVersion: crawlers.currentVersion,
          strategy: crawlers.strategy,
          status: crawlers.status,
          createdAt: crawlers.createdAt,
        })
        .from(crawlers)
        .orderBy(desc(crawlers.createdAt));

      return NextResponse.json({ crawlers: allCrawlers });
    }

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Crawlers fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
