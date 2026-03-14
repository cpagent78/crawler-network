import { NextRequest, NextResponse } from "next/server";

// POST /api/performance — 서비스가 성과 데이터 전달
export async function POST(request: NextRequest) {
  // TODO: Implement performance data recording
  return NextResponse.json({ message: "POST /api/performance - not implemented" }, { status: 501 });
}
