import { NextRequest, NextResponse } from "next/server";
import { refreshTrackedProfiles } from "@/lib/refresh";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => ({})) as { cursor?: number; batchSize?: number; force?: boolean };
  const { body, status } = await refreshTrackedProfiles(input);
  return NextResponse.json(body, { status });
}
