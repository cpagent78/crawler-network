import { NextRequest, NextResponse } from "next/server";

// POST /api/adoptions — 서비스가 채택 알림
export async function POST(request: NextRequest) {
  // TODO: Implement adoption recording and reward calculation
  return NextResponse.json({ message: "POST /api/adoptions - not implemented" }, { status: 501 });
}
