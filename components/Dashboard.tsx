"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Text,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { GrowthChart } from "@/components/GrowthChart";
import type { DashboardData, DashboardProfile, LinkedInPost } from "@/lib/types";

const format = Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const ranges = [7, 30, 90];

function signed(value: number, suffix = "") {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`;
}

function engagement(post: LinkedInPost) {
  return post.reactions + post.comments + post.reposts;
}

function MediaIcon({ type }: { type: LinkedInPost["mediaType"] }) {
  const icons = { image: ImageIcon, video: Video, document: FileText, link: Link2, text: Text };
  const Icon = icons[type];
  return <Icon size={15} />;
}

export function Dashboard() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?range=${range}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the dashboard.");
      setData(await response.json());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
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
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.errors?.[0]?.error || "Refresh failed.");
      setNotice(`Updated ${result.refreshedProfiles} profiles and ${result.fetchedPosts} posts.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function remove(profile: DashboardProfile) {
    if (!window.confirm(`Stop tracking ${profile.name}? Their stored history will also be removed.`)) return;
    await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
    await load();
  }

  const sorted = useMemo(() => [...(data?.profiles || [])].sort((a, b) => a.rank - b.rank), [data]);
  const self = data?.profiles.find((profile) => profile.isSelf);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark">in</span><span>Pulseboard</span></div>
        <button className="mobile-close" onClick={() => setMenu(false)} aria-label="Close menu"><X size={20} /></button>
        <nav>
          <p className="nav-label">Workspace</p>
          <a className="nav-item active" href="#overview"><LayoutDashboard size={18} />Overview</a>
          <a className="nav-item" href="#people"><Users size={18} />People<span className="nav-count">{data?.profiles.length || 0}</span></a>
          <a className="nav-item" href="#posts"><BarChart3 size={18} />Top posts</a>
          <p className="nav-label nav-label-spaced">Manage</p>
          <button className="nav-item nav-button" onClick={() => setModal(true)}><Plus size={18} />Add profile</button>
          <a className="nav-item" href="#setup"><Settings size={18} />Data setup</a>
        </nav>
        <div className="sidebar-card">
          <span className="sidebar-card-icon"><Sparkles size={17} /></span>
          <strong>Find the pattern.</strong>
          <p>Compare growth, cadence and ideas—not vanity metrics.</p>
        </div>
        <div className="sidebar-profile">
          {self && <Avatar profile={self} size="sm" />}
          <div><strong>{self?.name || "Your profile"}</strong><span>{self ? `${format.format(self.followers)} followers` : "Not configured"}</span></div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      {menu && <button className="scrim" onClick={() => setMenu(false)} aria-label="Close menu" />}

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button>
          <div className="breadcrumb"><span>LinkedIn intelligence</span><b>/</b><strong>Overview</strong></div>
          <div className="top-actions">
            <a className="button secondary export-label" href="/api/export"><Download size={16} />Export</a>
            <button className="button primary" onClick={() => void refresh()} disabled={refreshing || loading}>
              <RefreshCw size={16} className={refreshing ? "spin" : ""} />{refreshing ? "Refreshing" : "Refresh data"}
            </button>
          </div>
        </header>

        <div className="content" id="overview">
          <section className="page-heading">
            <div><p className="eyebrow">Audience intelligence</p><h1>Are you keeping pace?</h1><p>See who is growing, how often they post, and which ideas earn attention.</p></div>
            <div className="status-cluster">
              <span className={`data-status ${data?.hasMonidKey ? "live" : "demo"}`}><i />{data?.hasMonidKey ? "Monid connected" : "Demo data"}</span>
              {data?.lastRefreshedAt && <span className="last-updated">Updated {new Date(data.lastRefreshedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>}
            </div>
          </section>

          {(error || notice) && <div className={`toast ${error ? "toast-error" : "toast-success"}`}>{error || notice}<button onClick={() => { setError(""); setNotice(""); }}><X size={15} /></button></div>}
          {data?.isDemo && <div className="demo-banner"><span><Sparkles size={17} /></span><div><strong>You’re viewing a realistic demo.</strong><p>Add your profiles and connect Monid to replace it with live LinkedIn data.</p></div><button onClick={() => setModal(true)}>Add your profile <ArrowUpRight size={15} /></button></div>}

          {loading && !data ? <LoadingState /> : data && (
            <>
              <section className="metric-grid">
                <Metric label="Your follower growth" value={signed(data.summary.selfGrowth)} detail={`${signed(data.summary.selfGrowthPercent, "%")} in ${range} days`} tone={data.summary.selfGrowth >= 0 ? "positive" : "negative"} />
                <Metric label="Peer median growth" value={signed(data.summary.peerMedianGrowthPercent, "%")} detail={data.summary.selfGrowthPercent >= data.summary.peerMedianGrowthPercent ? "You’re ahead of the pack" : "Your benchmark to beat"} tone="neutral" />
                <Metric label="Your posting cadence" value={`${data.summary.selfPosts}`} detail={`${(data.summary.selfPosts / Math.max(range / 7, 1)).toFixed(1)} posts per week`} tone="neutral" />
                <Metric label="Growth rank" value={data.summary.selfRank ? `#${data.summary.selfRank}` : "—"} detail={`of ${data.summary.totalProfiles} tracked profiles`} tone={data.summary.selfRank <= 2 ? "positive" : "neutral"} />
              </section>

              <section className="panel chart-panel">
                <div className="panel-header">
                  <div><h2>Follower growth</h2><p>Daily audience size across everyone you track</p></div>
                  <div className="range-control">{ranges.map((item) => <button key={item} className={range === item ? "selected" : ""} onClick={() => setRange(item)}>{item}D</button>)}</div>
                </div>
                <div className="chart-legend">{data.profiles.map((profile) => <span key={profile.id}><i style={{ background: profile.accent }} />{profile.isSelf ? "You" : profile.name.split(" ")[0]} <b>{format.format(profile.followers)}</b></span>)}</div>
                <GrowthChart profiles={data.profiles} />
              </section>

              <section className="panel table-panel" id="people">
                <div className="panel-header">
                  <div><h2>Growth benchmark</h2><p>Ranked by follower growth rate over the selected period</p></div>
                  <button className="button secondary small" onClick={() => setModal(true)}><Plus size={15} />Add person</button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Rank</th><th>Profile</th><th>Followers</th><th>Growth</th><th>Posts</th><th>Avg. engagement</th><th /></tr></thead>
                    <tbody>{sorted.map((profile) => (
                      <tr key={profile.id} className={profile.isSelf ? "self-row" : ""}>
                        <td><span className={`rank rank-${profile.rank}`}>{profile.rank}</span></td>
                        <td><div className="person-cell"><Avatar profile={profile} /><div><strong>{profile.name}{profile.isSelf && <em>You</em>}</strong><span>{profile.headline}</span></div></div></td>
                        <td><strong className="tabular">{profile.followers.toLocaleString()}</strong></td>
                        <td><span className={`growth-pill ${profile.growthPercent >= 0 ? "up" : "down"}`}>{profile.growthPercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(profile.growthPercent).toFixed(1)}%</span><small>{signed(profile.growth)}</small></td>
                        <td><strong className="tabular">{profile.postsInRange}</strong><small>{(profile.postsInRange / Math.max(range / 7, 1)).toFixed(1)}/wk</small></td>
                        <td><strong className="tabular">{format.format(profile.avgEngagement)}</strong><small>weighted</small></td>
                        <td><div className="row-actions"><a href={profile.linkedinUrl} target="_blank" rel="noreferrer" aria-label={`Open ${profile.name} on LinkedIn`}><ExternalLink size={16} /></a><button onClick={() => void remove(profile)} aria-label={`Remove ${profile.name}`}><Trash2 size={16} /></button></div></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </section>

              <section id="posts" className="posts-section">
                <div className="section-heading"><div><h2>Posts earning attention</h2><p>The strongest ideas from your tracked set in the last {range} days</p></div><span>Engagement score = reactions + 2× comments + 3× reposts</span></div>
                <div className="post-grid">{data.topPosts.slice(0, 6).map((post, index) => (
                  <article className="post-card" key={post.id}>
                    <div className="post-top"><div className="person-cell"><Avatar profile={post.author} size="sm" /><div><strong>{post.author.name}</strong><span>{new Date(post.publishedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</span></div></div><span className="post-rank">#{index + 1}</span></div>
                    <p className="post-copy">{post.text}</p>
                    <div className="post-footer"><span><MediaIcon type={post.mediaType} />{post.mediaType}</span><span><ArrowUpRight size={15} />{format.format(post.reactions)}</span><span><MessageCircle size={15} />{format.format(post.comments)}</span><a href={post.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a></div>
                    <div className="post-score"><i style={{ width: `${Math.max(8, Math.min(100, (engagement(post) / Math.max(...data.topPosts.map(engagement))) * 100))}%` }} /></div>
                  </article>
                ))}</div>
              </section>

              <section className="setup-panel" id="setup">
                <div className="setup-icon"><CalendarDays /></div><div><h2>Make it useful over time.</h2><p>Follower growth only becomes meaningful after repeated snapshots. Run the refresh route daily using cron, GitHub Actions, or your host’s scheduler.</p></div><code>GET /api/cron/refresh</code><span className="setup-check"><Check size={16} />History is never overwritten</span>
              </section>
            </>
          )}
        </div>
      </main>
      {modal && <AddProfileModal onClose={() => setModal(false)} onSaved={async () => { setModal(false); await load(); }} />}
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "positive" | "negative" | "neutral" }) {
  return <article className="metric"><p>{label}</p><div><strong>{value}</strong><span className={tone}>{tone === "positive" ? <ArrowUpRight size={14} /> : tone === "negative" ? <ArrowDownRight size={14} /> : null}{detail}</span></div></article>;
}

function LoadingState() {
  return <div className="loading-state"><LoaderCircle className="spin" /><strong>Building your benchmark</strong><span>Loading profiles, growth history and posts…</span></div>;
}

function AddProfileModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", headline: "", linkedinUrl: "", isSelf: false });

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add profile.");
      await onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add profile."); setSaving(false); }
  }

  return <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-backdrop" onClick={onClose} aria-label="Close" /><form className="modal" onSubmit={submit}><div className="modal-header"><div><span className="modal-icon"><Plus /></span><div><h2 id="modal-title">Track a LinkedIn profile</h2><p>Add yourself first, then the people who set the benchmark.</p></div></div><button type="button" onClick={onClose}><X /></button></div>{error && <p className="form-error">{error}</p>}<label>Name<input required minLength={2} placeholder="e.g. Arjun Sharma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>LinkedIn profile URL<input required type="url" placeholder="https://linkedin.com/in/username" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} /></label><label>Headline <span>optional</span><input placeholder="Founder, writer, marketer…" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></label><label className="checkbox"><input type="checkbox" checked={form.isSelf} onChange={(e) => setForm({ ...form, isSelf: e.target.checked })} /><span><b>This is my profile</b><small>Marks this person as “You” in benchmarks.</small></span></label><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}{saving ? "Adding" : "Add profile"}</button></div></form></div>;
}
