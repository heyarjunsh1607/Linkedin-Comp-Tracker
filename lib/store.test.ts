import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/lib/types";

let testDirectory = "";

beforeEach(async () => {
  testDirectory = await mkdtemp(path.join(os.tmpdir(), "linkedin-tracker-store-"));
  process.env.TRACKER_DATA_FILE = path.join(testDirectory, "store.json");
  delete process.env.BLOB_READ_WRITE_TOKEN;
  vi.resetModules();
});

afterEach(async () => {
  await rm(testDirectory, { recursive: true, force: true });
  delete process.env.TRACKER_DATA_FILE;
  vi.resetModules();
});

function profile(): Profile {
  return {
    id: "arjun",
    name: "Arjun Sharma",
    headline: "Founder, PIXELUP LABS",
    linkedinUrl: "https://www.linkedin.com/in/arjunsh1607",
    accent: "#1769e0",
    isSelf: true,
    createdAt: "2026-08-14T00:00:00.000Z",
  };
}

describe("local tracker store", () => {
  it("replaces demo data when the first real profile is added", async () => {
    const { addProfile, readStore } = await import("@/lib/store");

    await addProfile(profile());

    const store = await readStore();
    expect(store.seededDemo).toBe(false);
    expect(store.profiles).toEqual([profile()]);
    expect(store.snapshots).toEqual([]);
    expect(store.posts).toEqual([]);
  });

  it("persists refreshes and profile removal", async () => {
    const { addProfile, readStore, removeProfile, saveRefreshes } = await import("@/lib/store");
    const trackedProfile = profile();
    await addProfile(trackedProfile);

    await saveRefreshes([{
      profile: { ...trackedProfile, lastRefreshedAt: "2026-08-14T01:00:00.000Z" },
      snapshot: {
        id: "snapshot-1",
        profileId: trackedProfile.id,
        capturedAt: "2026-08-14T01:00:00.000Z",
        followers: 67_000,
      },
      posts: [{
        id: "post-1",
        profileId: trackedProfile.id,
        url: "https://www.linkedin.com/feed/update/post-1",
        text: "A useful post",
        publishedAt: "2026-08-13T01:00:00.000Z",
        reactions: 10,
        comments: 2,
        reposts: 1,
        mediaType: "text",
        fetchedAt: "2026-08-14T01:00:00.000Z",
      }],
    }]);

    const refreshed = await readStore();
    expect(refreshed.profiles[0].lastRefreshedAt).toBe("2026-08-14T01:00:00.000Z");
    expect(refreshed.snapshots).toHaveLength(1);
    expect(refreshed.posts).toHaveLength(1);

    await removeProfile(trackedProfile.id);
    const removed = JSON.parse(await readFile(process.env.TRACKER_DATA_FILE!, "utf8"));
    expect(removed.profiles).toEqual([]);
    expect(removed.snapshots).toEqual([]);
    expect(removed.posts).toEqual([]);
  });
});
