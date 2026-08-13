import { NextResponse } from "next/server";
import { refreshTrackedProfiles } from "@/lib/refresh";

export const maxDuration = 300;

export async function POST() {
  const { body, status } = await refreshTrackedProfiles();
  return NextResponse.json(body, { status });
}
