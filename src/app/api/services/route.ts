import { NextRequest, NextResponse } from "next/server";

// POST /api/services — 서비스 등록/상태 변경
export async function POST(request: NextRequest) {
  // TODO: Implement service registration and status management
  return NextResponse.json({ message: "POST /api/services - not implemented" }, { status: 501 });
}
