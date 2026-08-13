import { promises as fs } from "node:fs";
import path from "node:path";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { createStarterStore, mergeWatchlist } from "@/lib/watchlist";
import type { LinkedInPost, Profile, Snapshot, TrackerStore } from "@/lib/types";

const BLOB_PATH = "linkedin-comp-tracker/store.json";
const DATA_FILE = process.env.TRACKER_DATA_FILE
  ? path.resolve(/* turbopackIgnore: true */ process.env.TRACKER_DATA_FILE)
  : path.join(process.cwd(), "data", "linkedin-tracker.json");
let writeQueue = Promise.resolve();

function usesBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function storageMode(): "blob" | "local" | "unconfigured" {
  if (usesBlobStore()) return "blob";
  return process.env.VERCEL ? "unconfigured" : "local";
}

async function ensureLocalStore(): Promise<TrackerStore> {
  try {
    return mergeWatchlist(JSON.parse(await fs.readFile(/* turbopackIgnore: true */ DATA_FILE, "utf8")) as TrackerStore);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const store = createStarterStore();
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2));
    return store;
  }
}

async function readBlobStore(): Promise<{ store: TrackerStore; etag?: string }> {
  const result = await get(BLOB_PATH, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return { store: createStarterStore() };
  const contents = await new Response(result.stream).text();
  return { store: mergeWatchlist(JSON.parse(contents) as TrackerStore), etag: result.blob.etag };
}

export async function readStore(): Promise<TrackerStore> {
  if (usesBlobStore()) return (await readBlobStore()).store;
  if (storageMode() === "unconfigured") return createStarterStore();
  return ensureLocalStore();
}

export async function updateStore(mutator: (store: TrackerStore) => TrackerStore | void) {
  let result!: TrackerStore;
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    if (usesBlobStore()) {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const current = await readBlobStore();
        const draft = structuredClone(current.store);
        const next = mutator(draft) || draft;
        try {
          await put(BLOB_PATH, JSON.stringify(next), {
            access: "private",
            allowOverwrite: Boolean(current.etag),
            cacheControlMaxAge: 60,
            contentType: "application/json",
            ifMatch: current.etag,
          });
          result = next;
          return;
        } catch (error) {
          if (attempt === 3 || (current.etag && !(error instanceof BlobPreconditionFailedError))) throw error;
        }
      }
      return;
    }

    if (storageMode() === "unconfigured") {
      throw new Error("Connect a Private Vercel Blob store before saving or refreshing data.");
    }

    const store = await ensureLocalStore();
    const draft = structuredClone(store);
    result = mutator(draft) || draft;
    const temp = `${DATA_FILE}.tmp`;
    await fs.writeFile(temp, JSON.stringify(result, null, 2));
    await fs.rename(temp, DATA_FILE);
  });
  await writeQueue;
  return result;
}

export async function addProfile(profile: Profile) {
  return updateStore((store) => {
    if (store.seededDemo) {
      store.profiles = [];
      store.snapshots = [];
      store.posts = [];
    }
    if (profile.isSelf) store.profiles.forEach((item) => (item.isSelf = false));
    store.seededDemo = false;
    store.profiles.push(profile);
  });
}

export async function removeProfile(id: string) {
  return updateStore((store) => {
    store.profiles = store.profiles.filter((profile) => profile.id !== id);
    store.snapshots = store.snapshots.filter((snapshot) => snapshot.profileId !== id);
    store.posts = store.posts.filter((post) => post.profileId !== id);
  });
}

type RefreshResult = { profile: Profile; snapshot: Snapshot; posts: LinkedInPost[] };

function postKey(post: LinkedInPost) {
  return `${post.profileId}:${post.url === "#" ? post.id : post.url}`;
}

function mergePosts(store: TrackerStore, posts: LinkedInPost[]) {
  const merged = new Map(store.posts.map((post) => [postKey(post), post]));
  for (const post of posts) merged.set(postKey(post), post);
  store.posts = [...merged.values()];
}

function applyRefresh(store: TrackerStore, { profile, snapshot, posts }: RefreshResult) {
  const index = store.profiles.findIndex((item) => item.id === profile.id);
  if (index >= 0) store.profiles[index] = profile;
  const today = snapshot.capturedAt.slice(0, 10);
  store.snapshots = store.snapshots.filter(
    (item) => !(item.profileId === profile.id && item.capturedAt.slice(0, 10) === today),
  );
  store.snapshots.push(snapshot);
  const recentCutoff = Date.now() - 31 * 86_400_000;
  store.posts = store.posts.filter(
    (post) => post.profileId !== profile.id || +new Date(post.publishedAt) < recentCutoff,
  );
  mergePosts(store, posts);
  store.seededDemo = false;
}

export async function saveRefreshes(refreshes: RefreshResult[]) {
  return updateStore((store) => {
    refreshes.forEach((refresh) => applyRefresh(store, refresh));
  });
}

export async function savePosts(profileId: string, posts: LinkedInPost[]) {
  return updateStore((store) => {
    const recentCutoff = Date.now() - 31 * 86_400_000;
    store.posts = store.posts.filter(
      (post) => post.profileId !== profileId || +new Date(post.publishedAt) < recentCutoff,
    );
    mergePosts(store, posts);
  });
}
