import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "@/lib/auth";

// POST /api/services/[id]/status — 서비스 상태 변경 (활성/비활성/한도)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.type !== "service" && auth.type !== "admin") {
    return NextResponse.json(
      { error: "Only services or admin can update status" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { active, reason } = body;

    if (active === undefined) {
      return NextResponse.json(
        { error: "Missing required field: active" },
        { status: 400 }
      );
    }

    await db
      .update(services)
      .set({ active: active ? 1 : 0 })
      .where(eq(services.id, id));

    // 모든 서비스가 비활성인지 확인
    const allServices = await db
      .select({ active: services.active })
      .from(services);

    const allInactive = allServices.every((s) => s.active === 0);

    return NextResponse.json({
      serviceId: id,
      active,
      reason: reason ?? null,
      allServicesInactive: allInactive,
      note: allInactive
        ? "All services inactive — crawlers should stop"
        : null,
    });
  } catch (error) {
    console.error("Service status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
