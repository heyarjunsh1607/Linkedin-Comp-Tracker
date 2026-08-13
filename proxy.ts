import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (!process.env.APP_PASSWORD || request.nextUrl.pathname === "/api/cron/refresh") {
    return NextResponse.next();
  }

  const expected = `Basic ${btoa(`${process.env.APP_USERNAME || "admin"}:${process.env.APP_PASSWORD}`)}`;
  if (request.headers.get("authorization") === expected) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Pulseboard"' },
    });
  }

  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Pulseboard"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
