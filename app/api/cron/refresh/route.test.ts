import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const refreshTrackedProfiles = vi.fn();

vi.mock("@/lib/refresh", () => ({ refreshTrackedProfiles }));

afterEach(() => {
  delete process.env.CRON_SECRET;
  refreshTrackedProfiles.mockReset();
});

describe("scheduled refresh route", () => {
  it("rejects requests without the cron bearer token", async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    const { GET } = await import("@/app/api/cron/refresh/route");

    const response = await GET(new NextRequest("http://localhost/api/cron/refresh"));

    expect(response.status).toBe(401);
    expect(refreshTrackedProfiles).not.toHaveBeenCalled();
  });

  it("runs the refresh directly after cron authentication", async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    refreshTrackedProfiles.mockResolvedValue({
      body: { ok: true, refreshedProfiles: 2, fetchedPosts: 27, errors: [], totalProfiles: 2, nextCursor: null, done: true },
      status: 200,
    });
    const { GET } = await import("@/app/api/cron/refresh/route");

    const response = await GET(new NextRequest("http://localhost/api/cron/refresh", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ refreshedProfiles: 2, fetchedPosts: 27 });
    expect(refreshTrackedProfiles).toHaveBeenCalledOnce();
  });
});
