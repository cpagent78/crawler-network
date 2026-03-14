import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "@/lib/auth";
import { randomBytes } from "crypto";

// POST /api/services — 서비스 등록 (Admin only)
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
    const { name, displayName, webhookUrl, dailyLimit } = body;

    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Missing required fields", required: ["name", "displayName"] },
        { status: 400 }
      );
    }

    const apiKey = `sk_${randomBytes(24).toString("hex")}`;

    const [service] = await db
      .insert(services)
      .values({
        name,
        displayName,
        apiKey,
        webhookUrl: webhookUrl ?? null,
        dailyLimit: dailyLimit ?? 100,
      })
      .returning();

    return NextResponse.json({
      serviceId: service.id,
      name: service.name,
      apiKey,
      webhookUrl: service.webhookUrl,
      dailyLimit: service.dailyLimit,
    });
  } catch (error) {
    console.error("Service registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/services — 서비스 목록 조회 (Admin only)
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.type !== "admin") {
    return NextResponse.json(
      { error: "Admin only" },
      { status: 403 }
    );
  }

  try {
    const allServices = await db
      .select({
        id: services.id,
        name: services.name,
        displayName: services.displayName,
        webhookUrl: services.webhookUrl,
        dailyLimit: services.dailyLimit,
        todayCount: services.todayCount,
        active: services.active,
        createdAt: services.createdAt,
      })
      .from(services);

    return NextResponse.json({ services: allServices });
  } catch (error) {
    console.error("Services fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
