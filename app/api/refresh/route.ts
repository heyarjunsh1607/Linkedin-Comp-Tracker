import { NextResponse } from "next/server";
import { fetchPosts, fetchProfile } from "@/lib/monid";
import { readStore, saveRefreshes } from "@/lib/store";
import type { LinkedInPost } from "@/lib/types";

export const maxDuration = 300;

export async function POST() {
  if (!process.env.MONID_API_KEY) {
    return NextResponse.json({ error: "Add MONID_API_KEY to .env.local before running a live refresh." }, { status: 503 });
  }
  const store = await readStore();
  if (store.seededDemo) {
    return NextResponse.json({ error: "Add your first real profile before running a paid Monid refresh." }, { status: 400 });
  }
  if (!store.profiles.length) return NextResponse.json({ error: "Add at least one profile first." }, { status: 400 });

  const outcomes = await Promise.allSettled(store.profiles.map((profile) => fetchProfile(profile)));
  const successful = outcomes.flatMap((outcome) => (outcome.status === "fulfilled" ? [outcome.value] : []));
  let posts: LinkedInPost[] = [];
  let postsError: string | undefined;
  try {
    posts = await fetchPosts(store.profiles);
  } catch (error) {
    postsError = error instanceof Error ? error.message : "Post refresh failed.";
  }
  await saveRefreshes(successful.map((item) => ({
    ...item,
    posts: posts.filter((post) => post.profileId === item.profile.id),
  })));
  const errors = outcomes.flatMap((outcome, index) =>
    outcome.status === "rejected"
      ? [{ profile: store.profiles[index].name, error: outcome.reason instanceof Error ? outcome.reason.message : "Refresh failed." }]
      : [],
  );
  if (postsError) errors.push({ profile: "Posts", error: postsError });

  return NextResponse.json({
    ok: successful.length > 0,
    refreshedProfiles: successful.length,
    fetchedPosts: posts.length,
    errors,
  }, { status: successful.length ? 200 : 502 });
}
