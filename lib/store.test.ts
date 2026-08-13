import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/lib/types";

let testDirectory = "";

beforeEach(async () => {
  testDirectory = await mkdtemp(path.join(os.tmpdir(), "linkedin-tracker-store-"));
  process.env.TRACKER_DATA_FILE = path.join(testDirectory, "store.json");
  vi.resetModules();
});

afterEach(async () => {
  await rm(testDirectory, { recursive: true, force: true });
  delete process.env.TRACKER_DATA_FILE;
  vi.resetModules();
});

function extraProfile(): Profile {
  return { id: "extra", name: "Extra Person", headline: "Founder", linkedinUrl: "https://www.linkedin.com/in/extra-person", accent: "#1769e0", isSelf: false, createdAt: "2026-08-14T00:00:00.000Z" };
}

describe("tracker store", () => {
  it("starts with the saved watchlist instead of synthetic demo data", async () => {
    const { readStore } = await import("@/lib/store");
    const store = await readStore();

    expect(store.seededDemo).toBe(false);
    expect(store.profiles).toHaveLength(14);
    expect(store.profiles[0]).toMatchObject({ name: "Arjun Sharma", isSelf: true });
    expect(store.profiles.at(-1)?.name).toBe("Sahil Bloom");
    expect(store.snapshots).toEqual([]);
    expect(store.posts).toEqual([]);
  });

  it("preserves extra profiles and persists refreshes and removal", async () => {
    const { addProfile, readStore, removeProfile, saveRefreshes } = await import("@/lib/store");
    const trackedProfile = extraProfile();
    await addProfile(trackedProfile);
    await saveRefreshes([{
      profile: { ...trackedProfile, lastRefreshedAt: "2026-08-14T01:00:00.000Z" },
      snapshot: { id: "snapshot-1", profileId: trackedProfile.id, capturedAt: "2026-08-14T01:00:00.000Z", followers: 67_000 },
      posts: [{ id: "post-1", profileId: trackedProfile.id, url: "https://www.linkedin.com/feed/update/post-1", text: "A useful post", publishedAt: "2026-08-13T01:00:00.000Z", reactions: 10, comments: 2, reposts: 1, mediaType: "text", fetchedAt: "2026-08-14T01:00:00.000Z" }],
    }]);

    const refreshed = await readStore();
    expect(refreshed.profiles).toHaveLength(15);
    expect(refreshed.snapshots).toHaveLength(1);
    expect(refreshed.posts).toHaveLength(1);

    await removeProfile(trackedProfile.id);
    const removed = JSON.parse(await readFile(process.env.TRACKER_DATA_FILE!, "utf8"));
    expect(removed.profiles).toHaveLength(14);
    expect(removed.snapshots).toEqual([]);
    expect(removed.posts).toEqual([]);
  });
});
