import type { Profile } from "@/lib/types";

export function Avatar({ profile, size = "md" }: { profile: Pick<Profile, "name" | "accent" | "avatarUrl">; size?: "sm" | "md" | "lg" }) {
  const initials = profile.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
  return (
    <span className={`avatar avatar-${size}`} style={{ background: profile.accent }}>
      {/* Remote LinkedIn image hosts vary by provider, so a plain img is intentional here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initials}
    </span>
  );
}
