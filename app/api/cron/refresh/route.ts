import { NextRequest, NextResponse } from "next/server";
import { refreshTrackedProfiles } from "@/lib/refresh";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { body, status } = await refreshTrackedProfiles();
  return NextResponse.json(body, { status });
}
