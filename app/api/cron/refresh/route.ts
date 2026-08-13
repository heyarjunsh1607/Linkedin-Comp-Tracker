import { NextRequest, NextResponse } from "next/server";
import { refreshTrackedProfiles } from "@/lib/refresh";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let cursor = 0;
  let refreshedProfiles = 0;
  let fetchedPosts = 0;
  const errors: Array<{ profile: string; error: string }> = [];
  let totalProfiles = 0;

  while (true) {
    const { body, status } = await refreshTrackedProfiles({ cursor, batchSize: 2 });
    if (status >= 400) return NextResponse.json(body, { status });
    refreshedProfiles += body.refreshedProfiles || 0;
    fetchedPosts += body.fetchedPosts || 0;
    errors.push(...(body.errors || []));
    totalProfiles = body.totalProfiles || totalProfiles;
    if (body.nextCursor === null || body.nextCursor === undefined) break;
    cursor = body.nextCursor;
  }

  return NextResponse.json({ ok: errors.length === 0, refreshedProfiles, fetchedPosts, errors, totalProfiles, done: true });
}
