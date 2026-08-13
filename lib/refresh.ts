import { fetchPosts, fetchProfile } from "@/lib/monid";
import { readStore, savePosts, saveRefreshes, storageMode } from "@/lib/store";

type RefreshError = { profile: string; error: string };

export type RefreshResponse = {
  ok?: boolean;
  error?: string;
  refreshedProfiles?: number;
  skippedProfiles?: number;
  fetchedPosts?: number;
  errors?: RefreshError[];
  cursor?: number;
  nextCursor?: number | null;
  totalProfiles?: number;
  done?: boolean;
};

export async function refreshTrackedProfiles(options: { cursor?: number; batchSize?: number; force?: boolean } = {}): Promise<{ body: RefreshResponse; status: number }> {
  if (!process.env.MONID_API_KEY) {
    return { body: { error: "Add MONID_API_KEY to .env.local before running a live refresh." }, status: 503 };
  }
  if (storageMode() === "unconfigured") {
    return { body: { error: "Connect a Private Vercel Blob store before running the weekly refresh." }, status: 503 };
  }

  const store = await readStore();
  if (!store.profiles.length) return { body: { error: "Add at least one profile first." }, status: 400 };

  const cursor = Math.max(0, Math.floor(options.cursor || 0));
  const batchSize = Math.max(1, Math.min(3, Math.floor(options.batchSize || 2)));
  const batch = store.profiles.slice(cursor, cursor + batchSize);
  if (!batch.length) {
    return {
      body: { ok: true, refreshedProfiles: 0, skippedProfiles: 0, fetchedPosts: 0, errors: [], cursor, nextCursor: null, totalProfiles: store.profiles.length, done: true },
      status: 200,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const pending = options.force ? batch : batch.filter((profile) => profile.lastRefreshedAt?.slice(0, 10) !== today);
  const results = await Promise.all(pending.map(async (profile) => {
    const [profileResult, postsResult] = await Promise.allSettled([
      fetchProfile(profile),
      fetchPosts([profile]),
    ]);
    return { profile, profileResult, postsResult };
  }));

  const refreshes = results.flatMap(({ profileResult, postsResult }) => profileResult.status === "fulfilled" ? [{
    ...profileResult.value,
    posts: postsResult.status === "fulfilled" ? postsResult.value : [],
  }] : []);
  if (refreshes.length) await saveRefreshes(refreshes);

  await Promise.all(results.map(({ profile, profileResult, postsResult }) =>
    profileResult.status === "rejected" && postsResult.status === "fulfilled"
      ? savePosts(profile.id, postsResult.value)
      : Promise.resolve(),
  ));

  const errors: RefreshError[] = results.flatMap(({ profile, profileResult, postsResult }) => {
    const messages: string[] = [];
    if (profileResult.status === "rejected") messages.push(`profile: ${profileResult.reason instanceof Error ? profileResult.reason.message : "failed"}`);
    if (postsResult.status === "rejected") messages.push(`posts: ${postsResult.reason instanceof Error ? postsResult.reason.message : "failed"}`);
    return messages.length ? [{ profile: profile.name, error: messages.join("; ") }] : [];
  });
  const fetchedPosts = results.reduce(
    (total, result) => total + (result.postsResult.status === "fulfilled" ? result.postsResult.value.length : 0),
    0,
  );
  const nextCursor = cursor + batch.length < store.profiles.length ? cursor + batch.length : null;

  return {
    body: {
      ok: results.some((result) => result.profileResult.status === "fulfilled" || result.postsResult.status === "fulfilled") || pending.length === 0,
      refreshedProfiles: results.filter((result) => result.profileResult.status === "fulfilled" || result.postsResult.status === "fulfilled").length,
      skippedProfiles: batch.length - pending.length,
      fetchedPosts,
      errors,
      cursor,
      nextCursor,
      totalProfiles: store.profiles.length,
      done: nextCursor === null,
    },
    status: 200,
  };
}
