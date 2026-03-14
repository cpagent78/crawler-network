import { NextRequest, NextResponse } from "next/server";

// GET /api/submissions — 서비스가 검토할 정보 목록 조회
export async function GET(request: NextRequest) {
  // TODO: Implement submission listing with pagination and filters
  return NextResponse.json({ message: "GET /api/submissions - not implemented" }, { status: 501 });
}

// POST /api/submissions — 크롤러가 정보 제출
export async function POST(request: NextRequest) {
  // TODO: Implement submission creation with Bloom filter dedup
  return NextResponse.json({ message: "POST /api/submissions - not implemented" }, { status: 501 });
}
