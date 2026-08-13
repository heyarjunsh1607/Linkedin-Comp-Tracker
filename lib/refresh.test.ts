import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkedInPost, Profile, TrackerStore } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  fetchProfile: vi.fn(),
  fetchPosts: vi.fn(),
  readStore: vi.fn(),
  saveRefreshes: vi.fn(),
  savePosts: vi.fn(),
}));

vi.mock("@/lib/monid", () => ({
  fetchProfile: mocks.fetchProfile,
  fetchPosts: mocks.fetchPosts,
}));

vi.mock("@/lib/store", () => ({
  readStore: mocks.readStore,
  saveRefreshes: mocks.saveRefreshes,
  savePosts: mocks.savePosts,
}));

import { refreshTrackedProfiles } from "@/lib/refresh";

function profile(id: string): Profile {
  return {
    id,
    name: id.toUpperCase(),
    headline: "",
    linkedinUrl: `https://www.linkedin.com/in/${id}`,
    accent: "#1769e0",
    isSelf: false,
    createdAt: "2026-08-14T00:00:00.000Z",
  };
}

function post(profileId: string): LinkedInPost {
  return {
    id: `${profileId}-post`,
    profileId,
    text: "Post",
    url: `https://www.linkedin.com/feed/update/${profileId}-post`,
    publishedAt: "2026-08-13T00:00:00.000Z",
    fetchedAt: "2026-08-14T00:00:00.000Z",
    reactions: 10,
    comments: 2,
    reposts: 1,
    mediaType: "text",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MONID_API_KEY = "monid_live_test";
  mocks.saveRefreshes.mockResolvedValue(undefined);
  mocks.savePosts.mockResolvedValue(undefined);
});

describe("weekly refresh batching", () => {
  it("saves each bounded batch and returns the next cursor", async () => {
    const profiles = [profile("one"), profile("two"), profile("three")];
    mocks.readStore.mockResolvedValue({ version: 1, profiles, snapshots: [], posts: [], seededDemo: false } satisfies TrackerStore);
    mocks.fetchProfile.mockImplementation(async (item: Profile) => ({
      profile: item,
      snapshot: { profileId: item.id, followers: 100, capturedAt: "2026-08-14T00:00:00.000Z" },
    }));
    mocks.fetchPosts.mockImplementation(async ([item]: Profile[]) => [post(item.id)]);

    const result = await refreshTrackedProfiles({ cursor: 0, batchSize: 2, force: true });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ refreshedProfiles: 2, fetchedPosts: 2, nextCursor: 2, done: false });
    expect(mocks.fetchProfile).toHaveBeenCalledTimes(2);
    expect(mocks.saveRefreshes).toHaveBeenCalledOnce();
  });

  it("keeps post data when the follower lookup fails", async () => {
    const profiles = [profile("one")];
    mocks.readStore.mockResolvedValue({ version: 1, profiles, snapshots: [], posts: [], seededDemo: false } satisfies TrackerStore);
    mocks.fetchProfile.mockRejectedValue(new Error("profile unavailable"));
    mocks.fetchPosts.mockResolvedValue([post("one")]);

    const result = await refreshTrackedProfiles({ force: true });

    expect(result.body).toMatchObject({ ok: true, refreshedProfiles: 1, fetchedPosts: 1, done: true });
    expect(result.body.errors).toEqual([{ profile: "ONE", error: "profile: profile unavailable" }]);
    expect(mocks.saveRefreshes).not.toHaveBeenCalled();
    expect(mocks.savePosts).toHaveBeenCalledWith("one", [post("one")]);
  });
});
