'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  generated_at: string;
  overview: {
    total_users: number; verified_users: number; banned_users: number;
    active_today: number; active_this_week: number; active_this_month: number;
    retention_rate: number; total_spins: number; total_wheel_spins: number;
    total_points_in_system: number; total_gems_in_circulation: number;
    total_pcedo_earned: number; total_pcedo_withdrawn: number;
    pending_withdrawals: number; referral_rate: number; total_referrals: number;
    gem_purchase_requests: number; verified_purchases: number; pending_purchases: number;
    avg_points_per_session: number; total_points_spun: number;
  };
  user_growth: { date: string; count: number }[];
  spin_activity: { date: string; sessions: number; points: number; spinners: number }[];
  wheel_prizes: { type: string; count: number; total: number }[];
  skin_dist: { name: string; rarity: string; owners: number }[];
  active_skin_usage: { skin: string; count: number }[];
  top_earners: { username: string; points: number; skin: string; referrals: number }[];
  top_referrers: { username: string; referrals: number }[];
  hourly_activity: { hour: number; count: number }[];
  coupons: { total: number; active: number; redemptions: number };
}

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'https://backend-production-app.up.railway.app/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(Math.round(n));
const fmtFull = (n: number) => Number(n).toLocaleString();
const RARITY_COLOR: Record<string, string> = { Common: '#9ca3af', Rare: '#60a5fa', Epic: '#a78bfa', Legendary: '#fbbf24' };
const SKIN_COLOR: Record<string, string> = { Obsidian: '#1a1a2e', Chrome: '#c0c0c0', Gold: '#ffd700', Sapphire: '#0f52ba', Neon: '#39ff14', Plasma: '#8a2be2' };
const HOUR_LABELS = ['12am','1','2','3','4','5','6','7','8','9','10','11','12pm','1','2','3','4','5','6','7','8','9','10','11'];

// ── Mini bar chart ────────────────────────────────────────────────────────────
function SparkBar({ data, color = '#00e5a0', height = 48, label }: { data: number[]; color?: string; height?: number; label?: (v: number, i: number) => string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
      {data.map((v, i) => (
        <div key={i} title={label?.(v, i) ?? String(v)}
          style={{ flex: 1, background: color, borderRadius: '2px 2px 0 0', height: `${Math.max(2, (v / max) * 100)}%`, opacity: 0.7 + (i / data.length) * 0.3, transition: 'height 0.5s ease' }} />
      ))}
    </div>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimCount({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (ref.current) clearInterval(ref.current);
    const start = Date.now();
    ref.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * ease));
      if (p >= 1) clearInterval(ref.current!);
    }, 16);
    return () => clearInterval(ref.current!);
  }, [value, duration]);
  return <>{fmtFull(display)}</>;
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, accent = '#00e5a0', icon, large }: {
  label: string; value: number | string; sub?: string; accent?: string; icon?: string; large?: boolean;
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 16, padding: large ? '24px 20px' : '18px 16px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.6 }} />
      {icon && <span style={{ fontSize: large ? 28 : 20, marginBottom: 2 }}>{icon}</span>}
      <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: large ? 32 : 22, color: '#fff', lineHeight: 1 }}>
        {typeof value === 'number' ? <AnimCount value={value} /> : value}
      </p>
      {sub && <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 3, height: 20, background: '#00e5a0', borderRadius: 2 }} />
        <h2 style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 800, fontSize: 13, color: 'rgba(255,255,255,0.8)', letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshed, setRefreshed] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats(await res.json());
      setRefreshed(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ov = stats?.overview;

  // Hourly chart — fill missing hours with 0
  const hourlyFull = Array.from({ length: 24 }, (_, h) => {
    const found = stats?.hourly_activity?.find(r => r.hour === h);
    return found?.count ?? 0;
  });

  const userGrowthCounts  = stats?.user_growth?.map(r => r.count) ?? [];
  const spinSessions      = stats?.spin_activity?.map(r => r.sessions) ?? [];
  const spinSpinners      = stats?.spin_activity?.map(r => r.spinners) ?? [];
  const spinDates         = stats?.spin_activity?.map(r => r.date.slice(5)) ?? [];

  const maxSkinOwners = Math.max(...(stats?.skin_dist?.map(s => s.owners) ?? [1]), 1);
  const maxHourly     = Math.max(...hourlyFull, 1);

  return (
    <main style={{ minHeight: '100dvh', background: '#080810', color: 'white', fontFamily: 'Rajdhani,sans-serif', position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Rajdhani:wght@400;500;600;700&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(0,229,160,0.3); border-radius: 4px; }
        .tile { animation: fadeUp 0.5s ease both; }
      `}</style>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(0,229,160,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 80px' }}>

        {/* ── Header ── */}
        <div style={{ padding: '40px 0 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e5a0', animation: 'pulse 2s ease-in-out infinite' }} />
                <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: 'rgba(0,229,160,0.7)', letterSpacing: 3 }}>LIVE ANALYTICS</span>
              </div>
              <h1 style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 28, color: '#fff', letterSpacing: 2, marginBottom: 6 }}>
                🌀 FIDGE
              </h1>
              <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 380 }}>
                Platform analytics & growth metrics · fidge.app
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {refreshed && (
                <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>
                  Refreshed {refreshed.toLocaleTimeString()} · 5min cache
                </p>
              )}
              <button onClick={load} style={{ padding: '8px 16px', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.25)', borderRadius: 8, color: '#00e5a0', fontFamily: 'Space Mono,monospace', fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>
                ↻ REFRESH
              </button>
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="20" cy="20" r="16" stroke="rgba(0,229,160,0.15)" strokeWidth="3" fill="none" />
              <circle cx="20" cy="20" r="16" stroke="#00e5a0" strokeWidth="3" fill="none" strokeDasharray="30 70" strokeLinecap="round" />
            </svg>
            <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Fetching platform data…</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '20px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 12, color: '#f87171', fontFamily: 'Space Mono,monospace', fontSize: 12 }}>
            ⚠ {error} — check that the backend is running and NEXT_PUBLIC_API_URL is set.
          </div>
        )}

        {stats && !loading && (
          <>
            {/* ── KEY METRICS ── */}
            <Section title="Key Metrics">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
                <Tile label="Total Users" value={ov!.total_users} icon="👥" accent="#00e5a0" large sub={`${fmtFull(ov!.verified_users)} verified`} />
                <Tile label="Active Today" value={ov!.active_today} icon="⚡" accent="#60a5fa" large sub={`${fmtFull(ov!.active_this_week)} this week`} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <Tile label="Total Spins" value={ov!.total_spins} accent="#a78bfa" icon="🌀" sub={`${fmtFull(ov!.total_wheel_spins)} wheel`} />
                <Tile label="Retention Rate" value={`${ov!.retention_rate}%`} accent="#f59e0b" icon="🔁" sub="spun on 2+ days" />
                <Tile label="Active This Month" value={ov!.active_this_month} accent="#fb923c" icon="📅" sub="unique spinners" />
                <Tile label="Total Referrals" value={ov!.total_referrals} accent="#34d399" icon="🔗" sub={`${ov!.referral_rate}% of users`} />
                <Tile label="Points in System" value={fmt(ov!.total_points_in_system)} accent="#c084fc" icon="⭐" sub={`${fmt(ov!.total_points_spun)} earned total`} />
                <Tile label="Gems in Circulation" value={fmtFull(ov!.total_gems_in_circulation)} accent="#fbbf24" icon="💎" sub="across all users" />
              </div>
            </Section>

            {/* ── USER GROWTH ── */}
            <Section title="User Growth · Last 14 Days">
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>NEW REGISTRATIONS / DAY</p>
                  <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 18, color: '#00e5a0' }}>
                    +{fmtFull(userGrowthCounts.reduce((a,b)=>a+b,0))} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono,monospace' }}>this period</span>
                  </p>
                </div>
                <SparkBar data={userGrowthCounts} color="#00e5a0" height={72}
                  label={(v, i) => `${stats.user_growth[i]?.date}: ${v} new users`} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {stats.user_growth.filter((_, i) => i % 2 === 0).map(r => (
                    <span key={r.date} style={{ fontFamily: 'Space Mono,monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{r.date.slice(5)}</span>
                  ))}
                </div>
              </div>
            </Section>

            {/* ── SPIN ACTIVITY ── */}
            <Section title="Spin Activity · Last 14 Days">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px' }}>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 12 }}>DAILY SESSIONS</p>
                  <SparkBar data={spinSessions} color="#60a5fa" height={56} label={(v, i) => `${spinDates[i]}: ${v} sessions`} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    {spinDates.filter((_, i) => i % 3 === 0).map(d => (
                      <span key={d} style={{ fontFamily: 'Space Mono,monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{d}</span>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px' }}>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 12 }}>UNIQUE SPINNERS / DAY</p>
                  <SparkBar data={spinSpinners} color="#a78bfa" height={56} label={(v, i) => `${spinDates[i]}: ${v} users`} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    {spinDates.filter((_, i) => i % 3 === 0).map(d => (
                      <span key={d} style={{ fontFamily: 'Space Mono,monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{d}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px' }}>
                <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 6 }}>AVG POINTS PER SESSION</p>
                <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 22, color: '#a78bfa' }}>{fmtFull(ov!.avg_points_per_session)} pts</p>
              </div>
            </Section>

            {/* ── HOURLY ACTIVITY ── */}
            <Section title="Hourly Activity Pattern (All Time)">
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 16px' }}>
                <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 12 }}>SPIN SESSIONS BY HOUR (UTC)</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
                  {hourlyFull.map((v, h) => (
                    <div key={h} title={`${HOUR_LABELS[h]}: ${v} sessions`} style={{ flex: 1, borderRadius: '2px 2px 0 0', height: `${Math.max(2, (v / maxHourly) * 100)}%`, background: v === Math.max(...hourlyFull) ? '#00e5a0' : 'rgba(96,165,250,0.5)', transition: 'height 0.6s ease' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {HOUR_LABELS.filter((_, i) => i % 4 === 0).map(l => (
                    <span key={l} style={{ fontFamily: 'Space Mono,monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{l}</span>
                  ))}
                </div>
              </div>
            </Section>

            {/* ── ECONOMY ── */}
            <Section title="Token & Gem Economy">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(187,143,206,0.2)', borderRadius: 16, padding: '20px 16px' }}>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(187,143,206,0.5)', letterSpacing: 2, marginBottom: 8 }}>$PCEDO EARNED (ALL TIME)</p>
                  <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 28, color: '#BB8FCE' }}><AnimCount value={Math.round(ov!.total_pcedo_earned)} /></p>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Withdrawn</span>
                      <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 11, color: '#34d399' }}>{fmtFull(ov!.total_pcedo_withdrawn)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Pending withdrawals</span>
                      <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 11, color: '#f59e0b' }}>{ov!.pending_withdrawals}</span>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 16, padding: '20px 16px' }}>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(251,191,36,0.5)', letterSpacing: 2, marginBottom: 8 }}>GEM MARKETPLACE</p>
                  <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 28, color: '#fbbf24' }}><AnimCount value={ov!.gem_purchase_requests} /></p>
                  <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>total purchase requests</p>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Verified</span>
                      <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 11, color: '#34d399' }}>{ov!.verified_purchases}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Pending</span>
                      <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 11, color: '#f59e0b' }}>{ov!.pending_purchases}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wheel prize breakdown */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px' }}>
                <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 12 }}>BONUS WHEEL — PRIZE DISTRIBUTION ({fmtFull(ov!.total_wheel_spins)} total spins)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.wheel_prizes.map(p => {
                    const total = stats.wheel_prizes.reduce((a, b) => a + b.count, 0) || 1;
                    const pct = Math.round((p.count / total) * 100);
                    const colors: Record<string, string> = { points: '#60a5fa', gems: '#fbbf24', pcedo: '#BB8FCE' };
                    const col = colors[p.type] ?? '#fff';
                    return (
                      <div key={p.type}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, fontSize: 13, color: col, textTransform: 'capitalize' }}>{p.type === 'pcedo' ? '$PCEDO' : p.type}</span>
                          <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{fmtFull(p.count)} wins · {pct}%</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 4, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Section>

            {/* ── SKIN ANALYTICS ── */}
            <Section title="Skin Adoption">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Ownership dist */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px' }}>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 14 }}>SKINS OWNED</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.skin_dist.map(s => (
                      <div key={s.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, fontSize: 13, color: SKIN_COLOR[s.name] ?? '#fff' }}>{s.name}</span>
                          <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: RARITY_COLOR[s.rarity] ?? '#fff' }}>{s.owners}</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                          <div style={{ height: '100%', width: `${(s.owners / maxSkinOwners) * 100}%`, background: SKIN_COLOR[s.name] ?? '#fff', borderRadius: 4, opacity: 0.7, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Active skin usage */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px' }}>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 14 }}>ACTIVE SKIN USAGE</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.active_skin_usage.map(s => {
                      const total = stats.active_skin_usage.reduce((a, b) => a + b.count, 0) || 1;
                      const pct = Math.round((s.count / total) * 100);
                      return (
                        <div key={s.skin}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, fontSize: 13, color: SKIN_COLOR[s.skin] ?? '#fff' }}>{s.skin}</span>
                            <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{pct}%</span>
                          </div>
                          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: SKIN_COLOR[s.skin] ?? '#fff', borderRadius: 4, opacity: 0.7, transition: 'width 1s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Section>

            {/* ── TOP USERS ── */}
            <Section title="Top Performers">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px' }}>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 14 }}>TOP EARNERS · POINTS</p>
                  {stats.top_earners.map((u, i) => (
                    <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 12, color: i === 0 ? '#FFD700' : 'rgba(255,255,255,0.25)', width: 16 }}>#{i+1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{u.username}</p>
                        <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 11, color: SKIN_COLOR[u.skin] ?? '#fff', opacity: 0.7 }}>{u.skin} skin</p>
                      </div>
                      <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 12, color: '#00e5a0' }}>{fmt(u.points)}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px' }}>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 14 }}>TOP REFERRERS</p>
                  {stats.top_referrers.map((u, i) => (
                    <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 12, color: i === 0 ? '#34d399' : 'rgba(255,255,255,0.25)', width: 16 }}>#{i+1}</span>
                      <p style={{ flex: 1, fontFamily: 'Space Mono,monospace', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{u.username}</p>
                      <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 12, color: '#34d399' }}>{u.referrals} refs</p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* ── PLATFORM HEALTH ── */}
            <Section title="Platform Health">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <Tile label="Coupon Redemptions" value={ov!.total_referrals > 0 ? stats.coupons.redemptions : 0} accent="#34d399" icon="🎟️" sub={`${stats.coupons.active} active codes`} />
                <Tile label="Banned Accounts" value={ov!.banned_users} accent="#f87171" icon="🚫" sub={`${ov!.total_users > 0 ? ((ov!.banned_users/ov!.total_users)*100).toFixed(1) : 0}% of users`} />
                <Tile label="Referral Rate" value={`${ov!.referral_rate}%`} accent="#34d399" icon="🔗" sub={`${fmtFull(ov!.total_referrals)} referred users`} />
              </div>
            </Section>

            {/* ── Footer ── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
                FIDGE PLATFORM ANALYTICS · fidge.app · Data cached every 5 minutes
              </p>
              <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
                Generated: {new Date(stats.generated_at).toLocaleString()}
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
