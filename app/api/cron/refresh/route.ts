import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const response = await fetch(new URL("/api/refresh", request.url), { method: "POST" });
  return NextResponse.json(await response.json(), { status: response.status });
}
