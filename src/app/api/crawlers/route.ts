import { NextRequest, NextResponse } from "next/server";

// POST /api/crawlers — 크롤러 등록
export async function POST(request: NextRequest) {
  // TODO: Implement crawler registration
  return NextResponse.json({ message: "POST /api/crawlers - not implemented" }, { status: 501 });
}

// GET /api/crawlers — 크롤러 목록 조회
export async function GET(request: NextRequest) {
  // TODO: Implement crawler listing
  return NextResponse.json({ message: "GET /api/crawlers - not implemented" }, { status: 501 });
}
