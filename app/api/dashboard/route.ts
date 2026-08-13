import { NextRequest, NextResponse } from "next/server";
import { buildDashboard } from "@/lib/analytics";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requested = Number(request.nextUrl.searchParams.get("range") || 30);
  const range = [7, 30, 90].includes(requested) ? requested : 30;
  return NextResponse.json(buildDashboard(await readStore(), range));
}
