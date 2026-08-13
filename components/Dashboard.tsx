"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { DashboardData } from "@/lib/types";

const ranges = [7, 30, 90];
const compact = Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function signed(value: number, suffix = "") {
  return `${value > 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`;
}

function lastRun(value?: string) {
  if (!value) return "Not run yet";
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export function Dashboard() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?range=${range}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Dashboard request failed (${response.status}).`);
      setData(result);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not load the dashboard." });
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    // The fetch is the external synchronization; loading state is managed inside it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    setRefreshProgress(0);
    setMessage(null);
    try {
      let cursor = 0;
      let refreshedProfiles = 0;
      let fetchedPosts = 0;
      const errors: Array<{ profile: string; error: string }> = [];
      let totalProfiles = data?.summary.totalProfiles || 14;

      while (true) {
        const response = await fetch("/api/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cursor, batchSize: 2 }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || result.errors?.[0]?.error || "Weekly refresh failed.");
        refreshedProfiles += result.refreshedProfiles || 0;
        fetchedPosts += result.fetchedPosts || 0;
        errors.push(...(result.errors || []));
        totalProfiles = result.totalProfiles || totalProfiles;
        setRefreshProgress(Math.min(result.nextCursor ?? totalProfiles, totalProfiles));
        if (result.nextCursor === null || result.nextCursor === undefined) break;
        cursor = result.nextCursor;
      }

      const summary = `Processed ${refreshedProfiles} profiles and fetched ${fetchedPosts} recent posts.`;
      const warnings = errors.map((item) => `${item.profile}: ${item.error}`).join(" ");
      setMessage({ tone: warnings ? "error" : "success", text: warnings ? `${summary} ${warnings}` : summary });
      await load();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Weekly refresh failed." });
    } finally {
      setRefreshing(false);
    }
  }

  const profiles = useMemo(
    () => [...(data?.profiles || [])].sort((a, b) => a.rank - b.rank),
    [data],
  );
  const self = data?.profiles.find((profile) => profile.isSelf);

  return (
    <main className="mvp-shell">
      <header className="mvp-header">
        <a className="mvp-brand" href="#top"><span>in</span>LinkedIn Watchlist</a>
        <div className="header-actions">
          <a className="button secondary" href="/api/export"><Download size={16} />Export</a>
          <button className="button primary" onClick={() => void refresh()} disabled={refreshing || loading}>
            {refreshing ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}
            {refreshing ? `Refreshing ${refreshProgress}/${data?.summary.totalProfiles || 14}…` : "Run weekly refresh"}
          </button>
        </div>
      </header>

      <div className="mvp-content" id="top">
        <section className="hero">
          <div>
            <p className="eyebrow">LinkedIn content research</p>
            <h1>See what worked this week.</h1>
            <p>Track one winning post from every person, then compare posting consistency and audience growth over time.</p>
          </div>
          <div className="connection-status">
            <span className={data?.hasMonidKey ? "ready" : "missing"}>{data?.hasMonidKey ? "Monid connected" : "Monid key missing"}</span>
            <small>Saved to your local data file</small>
          </div>
        </section>

        {message && <div className={`message ${message.tone}`}>{message.text}</div>}

        {loading && !data ? (
          <div className="loading"><LoaderCircle className="spin" /><span>Loading the watchlist…</span></div>
        ) : data && (
          <>
            <section className="summary-grid" aria-label="Weekly summary">
              <article><Users /><span>People tracked</span><strong>{data.summary.totalProfiles}</strong></article>
              <article><Trophy /><span>Winners found this week</span><strong>{data.summary.weeklyWinnerCount}</strong></article>
              <article><CalendarDays /><span>Last completed run</span><strong className="date-value">{lastRun(data.lastRefreshedAt)}</strong></article>
              <article><Avatar profile={self || { name: "Arjun Sharma", accent: "#1769e0" }} size="sm" /><span>Your followers</span><strong>{self?.followers ? self.followers.toLocaleString() : "—"}</strong></article>
            </section>

            <section className="mvp-section winners-section">
              <div className="section-header">
                <div><p className="eyebrow">Reverse-engineer the winners</p><h2>Best post from each profile</h2><span>Highest weighted engagement among posts published in the last 7 days.</span></div>
                <p className="formula">reactions + 2× comments + 3× reposts</p>
              </div>
              <div className="winner-grid">
                {data.weeklyWinners.map(({ profile, post }) => (
                  <article className={`winner-card ${post ? "" : "winner-card-empty"}`} key={profile.id}>
                    <div className="winner-person">
                      <Avatar profile={profile} />
                      <div><strong>{profile.name}{profile.isSelf && <em>You</em>}</strong><span>{post ? new Date(post.publishedAt).toLocaleDateString("en", { month: "short", day: "numeric" }) : "No post found this week"}</span></div>
                      {post && <b>{compact.format(post.engagement)}</b>}
                    </div>
                    {post ? (
                      <>
                        <p>{post.text}</p>
                        <footer>
                          <span>{compact.format(post.reactions)} reactions</span>
                          <span>{compact.format(post.comments)} comments</span>
                          <a href={post.url} target="_blank" rel="noreferrer" aria-label={`Open ${profile.name}'s winning post`}>View post <ExternalLink size={13} /></a>
                        </footer>
                      </>
                    ) : <p className="empty-post">The next weekly refresh will check this profile again.</p>}
                  </article>
                ))}
              </div>
            </section>

            <section className="mvp-section benchmark-section">
              <div className="section-header benchmark-header">
                <div><p className="eyebrow">Audience benchmark</p><h2>Growth and consistency</h2><span>Use this as a directional benchmark after you have several weekly snapshots.</span></div>
                <div className="range-control" role="group" aria-label="Benchmark period">
                  {ranges.map((item) => <button key={item} className={range === item ? "selected" : ""} onClick={() => setRange(item)}>{item}D</button>)}
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th scope="col">Rank</th><th scope="col">Person</th><th scope="col">Followers</th><th scope="col">Growth</th><th scope="col">Posts</th><th scope="col">Avg. engagement</th><th scope="col"><span className="sr-only">LinkedIn</span></th></tr></thead>
                  <tbody>{profiles.map((profile) => (
                    <tr key={profile.id} className={profile.isSelf ? "self-row" : ""}>
                      <td><span className="rank">{profile.rank}</span></td>
                      <td><div className="profile-cell"><Avatar profile={profile} /><div><strong>{profile.name}{profile.isSelf && <em>You</em>}</strong><span>{profile.headline || "Profile details load on the first refresh"}</span></div></div></td>
                      <td><strong>{profile.followers ? profile.followers.toLocaleString() : "—"}</strong></td>
                      <td><strong className={profile.growthPercent > 0 ? "positive" : profile.growthPercent < 0 ? "negative" : ""}>{profile.followers ? signed(profile.growthPercent, "%") : "—"}</strong><small>{profile.followers ? signed(profile.growth) : "No history yet"}</small></td>
                      <td><strong>{profile.postsInRange}</strong><small>in {range} days</small></td>
                      <td><strong>{profile.avgEngagement ? compact.format(profile.avgEngagement) : "—"}</strong><small>weighted</small></td>
                      <td><a className="external" href={profile.linkedinUrl} target="_blank" rel="noreferrer" aria-label={`Open ${profile.name} on LinkedIn`}><ExternalLink size={15} /></a></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>

            <p className="mvp-note">Open the app once a week and click Run weekly refresh. The first run creates the baseline; useful growth comparisons appear after later weekly runs.</p>
          </>
        )}
      </div>
    </main>
  );
}
