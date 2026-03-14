import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { crawlers, services } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AuthContext = {
  type: "admin" | "crawler" | "service";
  id?: string;
};

export async function authenticate(
  request: NextRequest
): Promise<AuthContext | NextResponse> {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  // Check admin key
  if (apiKey === process.env.ADMIN_API_KEY) {
    return { type: "admin" };
  }

  // Check crawler key
  const [crawler] = await db
    .select({ id: crawlers.id })
    .from(crawlers)
    .where(eq(crawlers.apiKey, apiKey))
    .limit(1);

  if (crawler) {
    return { type: "crawler", id: crawler.id };
  }

  // Check service key
  const [service] = await db
    .select({ id: services.id })
    .from(services)
    .where(eq(services.apiKey, apiKey))
    .limit(1);

  if (service) {
    return { type: "service", id: service.id };
  }

  return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
}
