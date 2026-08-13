"use client";

import { useId, useMemo, useState } from "react";
import type { DashboardProfile } from "@/lib/types";

const WIDTH = 900;
const HEIGHT = 300;
const PAD = { left: 64, right: 22, top: 22, bottom: 42 };

function compact(value: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function GrowthChart({ profiles }: { profiles: DashboardProfile[] }) {
  const gradientId = useId().replaceAll(":", "");
  const [hover, setHover] = useState<number | null>(null);
  const chart = useMemo(() => {
    const points = profiles.flatMap((profile) => profile.history.map((point) => point.followers));
    const minimum = points.length ? Math.min(...points) : 0;
    const maximum = points.length ? Math.max(...points) : 1;
    const min = Math.floor((minimum * 0.97) / 1000) * 1000;
    const max = Math.ceil((maximum * 1.02) / 1000) * 1000;
    const dates = profiles[0]?.history.map((point) => point.date) || [];
    const x = (index: number) => PAD.left + (index / Math.max(dates.length - 1, 1)) * (WIDTH - PAD.left - PAD.right);
    const y = (value: number) => PAD.top + ((max - value) / Math.max(max - min, 1)) * (HEIGHT - PAD.top - PAD.bottom);
    return { min, max, dates, x, y };
  }, [profiles]);

  const ticks = Array.from({ length: 5 }, (_, index) => chart.min + ((chart.max - chart.min) / 4) * index).reverse();
  const self = profiles.find((profile) => profile.isSelf);

  return (
    <div className="chart-wrap">
      <svg className="growth-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Follower growth chart">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={self?.accent || "#1769e0"} stopOpacity=".2" />
            <stop offset="1" stopColor={self?.accent || "#1769e0"} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={chart.y(tick)} y2={chart.y(tick)} className="grid-line" />
            <text x={PAD.left - 14} y={chart.y(tick) + 4} textAnchor="end" className="axis-label">{compact(tick)}</text>
          </g>
        ))}
        {self && self.history.length > 1 && (
          <path
            d={`M ${chart.x(0)} ${HEIGHT - PAD.bottom} L ${self.history.map((point, index) => `${chart.x(index)} ${chart.y(point.followers)}`).join(" L ")} L ${chart.x(self.history.length - 1)} ${HEIGHT - PAD.bottom} Z`}
            fill={`url(#${gradientId})`}
          />
        )}
        {profiles.map((profile) => (
          <path
            key={profile.id}
            d={profile.history.map((point, index) => `${index ? "L" : "M"} ${chart.x(index)} ${chart.y(point.followers)}`).join(" ")}
            fill="none"
            stroke={profile.accent}
            strokeWidth={profile.isSelf ? 3.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={profile.isSelf ? 1 : 0.65}
          />
        ))}
        {chart.dates.map((_, index) => (
          <rect
            key={index}
            x={chart.x(index) - Math.max((WIDTH - PAD.left - PAD.right) / chart.dates.length / 2, 2)}
            y={PAD.top}
            width={Math.max((WIDTH - PAD.left - PAD.right) / chart.dates.length, 4)}
            height={HEIGHT - PAD.top - PAD.bottom}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}
        {hover !== null && chart.dates[hover] && (
          <>
            <line x1={chart.x(hover)} x2={chart.x(hover)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="hover-line" />
            {profiles.map((profile) => profile.history[hover] && (
              <circle key={profile.id} cx={chart.x(hover)} cy={chart.y(profile.history[hover].followers)} r="4.5" fill="white" stroke={profile.accent} strokeWidth="3" />
            ))}
          </>
        )}
        {[0, Math.floor((chart.dates.length - 1) / 2), chart.dates.length - 1].filter((value, index, list) => value >= 0 && list.indexOf(value) === index).map((index) => (
          <text key={index} x={chart.x(index)} y={HEIGHT - 12} textAnchor={index === 0 ? "start" : index === chart.dates.length - 1 ? "end" : "middle"} className="axis-label">
            {new Date(chart.dates[index]).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>
      {hover !== null && chart.dates[hover] && (
        <div className="chart-tooltip" style={{ left: `${(chart.x(hover) / WIDTH) * 100}%` }}>
          <strong>{new Date(chart.dates[hover]).toLocaleDateString("en", { month: "short", day: "numeric" })}</strong>
          {profiles.map((profile) => profile.history[hover] && (
            <span key={profile.id}><i style={{ background: profile.accent }} />{profile.name.split(" ")[0]} <b>{compact(profile.history[hover].followers)}</b></span>
          ))}
        </div>
      )}
    </div>
  );
}
