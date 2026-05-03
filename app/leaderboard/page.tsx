'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import TopHeader from '@/components/TopHeader';
import LegalModal, { ModalType } from '@/components/LegalModal';
import { useAuth } from '@/context/AuthContext';
import { Leaderboard as LeaderboardApi, Coupons, Profile } from '@/lib/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const POINTS_REWARDS: Record<number, string> = {
  1: '$500 + 40k $PCEDO + 💎 Gems',
  2: '20k $PCEDO + 💎 Gems',
  3: '10k $PCEDO + 💎 Gems',
  4: '5k $PCEDO', 5: '3k $PCEDO', 6: '2k $PCEDO',
  7: '2k $PCEDO', 8: '1.5k $PCEDO', 9: '1k $PCEDO', 10: '750 $PCEDO',
};
const REFERRAL_MILESTONES = [
  { refs: 10,  reward: '1 💎'  },
  { refs: 15,  reward: '3 💎'  },
  { refs: 30,  reward: '9 💎'  },
  { refs: 50,  reward: '15 💎' },
  { refs: 100, reward: '50 💎' },
];
const GOLD   = 'rgba(255,215,0,0.95)';
const SILVER = 'rgba(192,192,192,0.9)';
const BRONZE = 'rgba(205,127,50,0.9)';

function pad(n: number) { return String(n).padStart(2, '0'); }

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const id = setInterval(() => setLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return {
    d: Math.floor(left / 86400),
    h: Math.floor((left % 86400) / 3600),
    m: Math.floor((left % 3600) / 60),
    s: left % 60,
  };
}

// ── Portal ────────────────────────────────────────────────────────────────────
function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ── BottomSheet wrapper ───────────────────────────────────────────────────────
function BottomSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <Portal>
      <style>{`
        @keyframes _lbFade   { from{opacity:0} to{opacity:1} }
        @keyframes _lbSlide  { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', zIndex:9000, animation:'_lbFade 0.2s ease', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ width:'100%', maxWidth:520, background:'linear-gradient(160deg,#141414,#0a0a0a)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'24px 24px 0 0', paddingBottom:'max(28px, env(safe-area-inset-bottom))', boxShadow:'0 -20px 60px rgba(0,0,0,0.9)', animation:'_lbSlide 0.3s cubic-bezier(0.32,1.1,0.6,1)', maxHeight:'88vh', overflowY:'auto', WebkitOverflowScrolling:'touch' as any }}
        >
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.15)' }}/>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// ── Login Gate ─────────────────────────────────────────────────────────────────
function LeaderboardLoginGate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>🏆</div>
      <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 10, letterSpacing: 1 }}>
        SIGN IN TO VIEW LEADERBOARD
      </p>
      <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 280, lineHeight: 1.6, marginBottom: 28 }}>
        Sign in to see rankings, compete for prizes, share your referral link, and redeem coupon codes.
      </p>
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '16px 20px', maxWidth: 300, width: '100%' }}>
        <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10 }}>WHAT YOU UNLOCK</p>
        {['Live leaderboard rankings', 'Prize cycle countdown', 'Your rank & score', 'Refer & Earn rewards', 'Coupon code redemption'].map((item: string, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,215,0,0.7)', flexShrink: 0 }} />
            <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{item}</p>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 20 }}>
        Tap <b style={{ color: 'rgba(255,255,255,0.5)' }}>Connect</b> in the top bar to get started
      </p>
    </div>
  );
}

export default function LeaderboardPage() {
  const { loggedIn, username, email, avatarColor, applyUserPatch, referralCode: walletReferralCode } = useAuth();

  const [loaded,       setLoaded]       = useState(false);
  const [tab,          setTab]          = useState<'points' | 'referrals'>('points');
  const [modal,        setModal]        = useState<ModalType>(null);
  const [couponOpen,   setCouponOpen]   = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [couponInput,  setCouponInput]  = useState('');
  const [couponMsg,    setCouponMsg]    = useState<{ text: string; ok: boolean } | null>(null);
  const [refSubTab,    setRefSubTab]    = useState<'link' | 'active' | 'inactive'>('link');
  const [copied,       setCopied]       = useState(false);
  const [redeeming,    setRedeeming]    = useState(false);

  const [lbData,       setLbData]       = useState<any>(null);
  const [profileData,  setProfileData]  = useState<any>(null);
  const [lbError,      setLbError]      = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    LeaderboardApi.get().then(setLbData).catch((e) => { setLbError(e instanceof Error ? e.message : 'Failed to load leaderboard'); });
  }, []);

  useEffect(() => {
    if (loggedIn) {
      // Always get fresh referral list from profile endpoint
      Profile.get().then(d => {
        setProfileData(d);
        // Use profile referral_code as backup; primary comes from AuthContext
        setReferralCode(d.user.referral_code ?? walletReferralCode ?? '');
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const rawEntries  = lbData?.entries ?? [];
  const cycle       = lbData?.cycle ?? null;

  // Calculate seconds_left from ends_at timestamp
  const secondsLeft = cycle?.ends_at
    ? Math.max(0, Math.floor((new Date(cycle.ends_at).getTime() - Date.now()) / 1000))
    : 0;
  const { d, h, m, s } = useCountdown(secondsLeft);

  // Points board = entries sorted by points (already sorted by backend)
  const pointsBoard   = rawEntries.map((e: any, i: number) => ({ ...e, rank: i + 1 }));
  // Referral board = same entries re-sorted by referral_count
  const referralBoard = [...rawEntries]
    .sort((a: any, b: any) => (b.referral_count ?? 0) - (a.referral_count ?? 0))
    .map((e: any, i: number) => ({ ...e, rank: i + 1 }));

  const board = tab === 'points' ? pointsBoard : referralBoard;

  // Find current user's rank
  const userPointsRank   = email ? pointsBoard.find((e: any) => e.email === email) : null;
  const userReferralRank = email ? referralBoard.find((e: any) => e.email === email) : null;
  const userRank         = tab === 'points' ? userPointsRank : userReferralRank;

  const myReferrals  = profileData?.referrals ?? [];
  const activeRefs   = myReferrals.filter((r: any) => r.active);
  const inactiveRefs = myReferrals.filter((r: any) => !r.active);

  const activeReferralCode = walletReferralCode || referralCode;
  const referralLink = typeof window !== 'undefined' && activeReferralCode
    ? `${window.location.origin}/join?ref=${activeReferralCode}`
    : 'Sign in to get your link';

  const handleCopy = () => {
    if (!activeReferralCode) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleShare = () => {
    if (navigator.share && activeReferralCode) {
      navigator.share({ title: 'Join Fidge!', text: 'Join me on Fidge and earn rewards!', url: referralLink });
    } else {
      handleCopy();
    }
  };

  const handleRedeem = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code)      { setCouponMsg({ text: 'Enter a coupon code', ok: false }); return; }
    if (!loggedIn) { setCouponMsg({ text: 'Connect your wallet first', ok: false }); return; }
    setRedeeming(true);
    try {
      const res = await Coupons.redeem(code);
      applyUserPatch({ gems: res.gems, points: res.points });
      setCouponMsg({ text: `✓ ${res.message}`, ok: true });
      setCouponInput('');
    } catch (e: any) {
      setCouponMsg({ text: e.message ?? 'Invalid or expired code', ok: false });
    } finally {
      setRedeeming(false);
    }
  };

  const closeCoupon = () => { setCouponOpen(false); setCouponMsg(null); setCouponInput(''); };

  // Is the current user already visible in the top section?
  const userInBoard = board.slice(0, 10).some(
    (r: any) => r.email === email || r.username === username
  );

  return (
    <main style={{ minHeight:'100vh', background:'#000', position:'relative', overflow:'hidden', WebkitTapHighlightColor:'transparent' as any }}>
      <style>{`@keyframes _spin2{to{transform:rotate(360deg)}}`}</style>

      {/* Loader */}
      {!loaded && (
        <div style={{ position:'fixed', inset:0, background:'#000', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" style={{ animation:'_spin2 1s linear infinite' }}>
            <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none"/>
            <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" fill="none" strokeDasharray="40 85" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      <div className="dot-bg" style={{ position:'absolute', inset:0, opacity:0.2, pointerEvents:'none' }}/>
      <TopHeader title="Leaderboard" showConnect onMenuSelect={k => setModal(k as ModalType)} />

      {/* ── Login gate ── */}
      {!loggedIn ? (
        <LeaderboardLoginGate />
      ) : (
      <>
      {/* ── Main scroll area ── */}
      <div style={{ position:'relative', zIndex:1, padding:'18px 16px', paddingBottom: loggedIn ? '120px' : '100px', display:'flex', flexDirection:'column', gap:'12px' }}>

        {/* Countdown */}
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:'2px', marginBottom:5 }}>LEADERBOARD RESETS IN</p>
            <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:18, color:'white', letterSpacing:2 }}>
              {cycle
                ? <>{pad(d)}<Dim>d </Dim>{pad(h)}<Dim>h </Dim>{pad(m)}<Dim>m </Dim>{pad(s)}<Dim>s</Dim></>
                : <span style={{ color:'rgba(255,255,255,0.25)' }}>-- -- -- --</span>}
            </p>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:'2px', marginBottom:5 }}>CYCLE</p>
            <p style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:600, fontSize:13, color:'rgba(255,255,255,0.4)' }}>
              {cycle ? cycle.name : '—'}
            </p>
            <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:12, color:'rgba(255,255,255,0.3)' }}>
              {cycle?.ends_at ? new Date(cycle.ends_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <ActionCard
            onClick={() => setReferralOpen(true)}
            icon="🔗"
            label="REFER & EARN"
            sub="Share your link"
            accent="rgba(0,200,120,0.9)"
            bg="rgba(0,200,120,0.08)"
            border="rgba(0,200,120,0.2)"
          />
          <ActionCard
            onClick={() => setCouponOpen(true)}
            icon="🎟️"
            label="REDEEM CODE"
            sub="Enter coupon"
            accent="rgba(255,200,80,0.9)"
            bg="rgba(255,180,0,0.08)"
            border="rgba(255,180,0,0.2)"
          />
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:4, gap:4 }}>
          {(['points','referrals'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:11, letterSpacing:'1px', background: tab===t ? 'rgba(255,255,255,0.1)' : 'transparent', color: tab===t ? 'white' : 'rgba(255,255,255,0.3)', transition:'all 0.2s' }}>
              {t === 'points' ? '⭐ POINTS' : '🔗 REFERRALS'}
            </button>
          ))}
        </div>

        {/* Grand prize banner */}
        {tab === 'points' && (
          <div style={{ background:'linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,140,0,0.08))', border:'1px solid rgba(255,215,0,0.3)', borderRadius:14, padding:'14px 18px', textAlign:'center' }}>
            <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:800, fontSize:13, color:'#FFD700', letterSpacing:'1px' }}>
              🏆 Grand Prize: $500 + 💎 Gems + 40,000 $PCEDO
            </p>
          </div>
        )}

        {/* Referrals tab info */}
        {tab === 'referrals' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ background:'rgba(0,200,120,0.07)', border:'1px solid rgba(0,200,120,0.2)', borderRadius:12, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <p style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:600, fontSize:14, color:'rgba(255,255,255,0.6)' }}>Per active referral</p>
              <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:15, color:'rgba(0,220,140,0.9)' }}>+100 ⭐</p>
            </div>
            <p style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'2px', textAlign:'center' }}>GEM MILESTONES</p>
            {REFERRAL_MILESTONES.map(ms => (
              <div key={ms.refs} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:'rgba(100,180,255,0.1)', border:'1px solid rgba(100,180,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:11, color:'rgba(100,200,255,0.8)' }}>{ms.refs}</div>
                  <p style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:600, fontSize:14, color:'rgba(255,255,255,0.5)' }}>active referrals</p>
                </div>
                <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:14, color:'rgba(100,200,255,0.9)' }}>{ms.reward}</p>
              </div>
            ))}
          </div>
        )}

        {/* Board */}
        {lbError ? (
          <div style={{ textAlign:'center', padding:40, color:'rgba(255,100,100,0.7)', fontFamily:'Space Mono,monospace', fontSize:11 }}>
            ⚠ {lbError}
          </div>
        ) : board.length === 0 ? (
          <div style={{ textAlign:'center', padding:48 }}>
            {lbData === null
              ? <div style={{ animation:'_spin2 1s linear infinite', display:'inline-block', fontSize:28, color:'rgba(255,255,255,0.3)' }}>⟳</div>
              : <p style={{ color:'rgba(255,255,255,0.3)', fontFamily:'Space Mono,monospace', fontSize:12 }}>No entries yet — start spinning to appear here!</p>
            }
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

            {/* Podium top 3 */}
            {board.length >= 3 && (
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:6, marginBottom:20, padding:'0 4px' }}>
                <PodiumCard row={board[1]} rank={2} tab={tab} email={email} username={username} color={SILVER} height={60} />
                <PodiumCard row={board[0]} rank={1} tab={tab} email={email} username={username} color={GOLD}   height={80} crown />
                <PodiumCard row={board[2]} rank={3} tab={tab} email={email} username={username} color={BRONZE} height={50} />
              </div>
            )}

            {/* Rows 4+ */}
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {board.slice(3).map((row: any, i: number) => {
                const rank   = row.rank ?? i + 4;
                const isMe   = loggedIn && (row.email === email || row.username === username);
                const score  = tab === 'points' ? row.points : row.referral_count;
                const reward = tab === 'points' ? POINTS_REWARDS[rank] : undefined;
                return (
                  <div key={rank} style={{ display:'flex', alignItems:'center', gap:10, background: isMe ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)', border:`1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius:12, padding:'12px 14px' }}>
                    <span style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:11, color:'rgba(255,255,255,0.3)', width:26, textAlign:'center', flexShrink:0 }}>#{rank}</span>
                    <div style={{ width:34, height:34, borderRadius:'50%', background: row.avatar_color ?? '#555', border:'2px solid rgba(255,255,255,0.15)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:12, color:'white' }}>
                      {(row.username ?? '?')[2]?.toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontFamily:'Space Mono,monospace', fontSize:11, color: isMe ? 'white' : 'rgba(255,255,255,0.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.username}</p>
                      {reward && <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:11, color:'rgba(0,220,140,0.8)', marginTop:2 }}>{reward}</p>}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:13, color:'white' }}>
                        {Number(score ?? 0).toLocaleString()}
                        <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:10, color:'rgba(255,255,255,0.35)', marginLeft:4 }}>{tab === 'points' ? 'PTS' : 'REF'}</span>
                      </p>
                      {tab === 'points' && (
                        <p style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:'rgba(255,255,255,0.2)', marginTop:2 }}>
                          {Number(row.referral_count ?? 0)} refs
                        </p>
                      )}
                    </div>
                    {isMe && <YouBadge />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky "YOU" bar at bottom ── */}
      {loggedIn && (
        <Portal>
          <div style={{ position:'fixed', bottom: 100, left:0, right:0, display:'flex', justifyContent:'center', padding:'0 12px', zIndex:500, pointerEvents:'none' }}>
            <div style={{ width:'100%', maxWidth:520, background:'rgba(12,12,12,0.97)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:16, padding:'12px 16px', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', boxShadow:'0 -8px 32px rgba(0,0,0,0.6)', pointerEvents:'all' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {/* Rank indicator */}
                <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {userRank?.rank
                    ? <span style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:11, color:'rgba(255,255,255,0.6)' }}>#{userRank.rank}</span>
                    : <span style={{ fontSize:16 }}>—</span>}
                </div>

                {/* Avatar */}
                <div style={{ width:34, height:34, borderRadius:'50%', background: avatarColor ?? 'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:13, color:'white', flexShrink:0 }}>
                  {username?.[2]?.toUpperCase()}
                </div>

                {/* Address + status */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'rgba(255,255,255,0.7)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{username}</p>
                  <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:1 }}>
                    {userRank?.rank ? `Rank #${userRank.rank}` : 'Not ranked yet'}
                  </p>
                </div>

                {/* Score */}
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:15, color:'white' }}>
                    {userRank ? Number(tab === 'points' ? userRank.points : userRank.referral_count).toLocaleString() : '0'}
                  </p>
                  <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:1 }}>{tab === 'points' ? 'PTS' : 'REF'}</p>
                  {tab === 'points' && userRank && (
                    <p style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:'rgba(255,255,255,0.25)', marginTop:1 }}>
                      {Number(userRank.referral_count ?? 0)} refs
                    </p>
                  )}
                </div>

                <YouBadge />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Referral modal ── */}
      {referralOpen && (
        <BottomSheet onClose={() => setReferralOpen(false)}>
          <div style={{ padding:'8px 20px 0' }}>
            <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:16, color:'white', marginBottom:18 }}>REFER & EARN</p>

            {/* Stats row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:18 }}>
              {[
                { label:'TOTAL',    val: myReferrals.length, color:'white' },
                { label:'ACTIVE',   val: activeRefs.length,   color:'rgba(0,220,140,0.9)' },
                { label:'INACTIVE', val: inactiveRefs.length,  color:'rgba(255,100,100,0.9)' },
              ].map(st => (
                <div key={st.label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
                  <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:22, color:st.color }}>{st.val}</p>
                  <p style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:'rgba(255,255,255,0.3)', marginTop:4, letterSpacing:'1px' }}>{st.label}</p>
                </div>
              ))}
            </div>

            {/* Sub tabs */}
            <div style={{ display:'flex', gap:6, marginBottom:16, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:4 }}>
              {(['link','active','inactive'] as const).map(t => (
                <button key={t} onClick={() => setRefSubTab(t)} style={{ flex:1, padding:'8px 4px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:'Space Mono,monospace', fontSize:8, letterSpacing:'1px', background: refSubTab===t ? 'rgba(255,255,255,0.1)' : 'transparent', color: refSubTab===t ? 'white' : 'rgba(255,255,255,0.35)', transition:'all 0.15s' }}>
                  {t === 'link' ? 'MY LINK' : t === 'active' ? `✓ ACTIVE (${activeRefs.length})` : `✗ PENDING (${inactiveRefs.length})`}
                </button>
              ))}
            </div>

            {/* MY LINK tab */}
            {refSubTab === 'link' && (
              <div style={{ marginBottom:20 }}>
                {!loggedIn && (
                  <div style={{ background:'rgba(255,200,80,0.08)', border:'1px solid rgba(255,200,80,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:12, textAlign:'center' }}>
                    <p style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:600, fontSize:14, color:'rgba(255,200,80,0.8)' }}>Connect your wallet to get your referral link</p>
                  </div>
                )}
                <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
                  <p style={{ fontFamily:'Space Mono,monospace', fontSize:11, color: referralCode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', wordBreak:'break-all', lineHeight:1.5 }}>{referralLink}</p>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={handleCopy} disabled={!activeReferralCode} style={{ flex:1, padding:14, borderRadius:12, background: copied ? 'rgba(0,200,120,0.15)' : 'rgba(255,255,255,0.08)', border:`1px solid ${copied ? 'rgba(0,200,120,0.4)' : 'rgba(255,255,255,0.15)'}`, color: copied ? 'rgba(0,220,140,0.9)' : 'white', fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:12, cursor: activeReferralCode ? 'pointer' : 'not-allowed', opacity: activeReferralCode ? 1 : 0.4, transition:'all 0.2s' }}>
                    {copied ? '✓ COPIED!' : 'COPY'}
                  </button>
                  <button onClick={handleShare} disabled={!activeReferralCode} style={{ flex:1, padding:14, borderRadius:12, background:'white', border:'none', color:'black', fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:12, cursor: activeReferralCode ? 'pointer' : 'not-allowed', opacity: activeReferralCode ? 1 : 0.4 }}>
                    SHARE
                  </button>
                </div>

                {/* Milestone progress */}
                {loggedIn && (
                  <div style={{ marginTop:18 }}>
                    <p style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'2px', marginBottom:10 }}>GEM MILESTONES</p>
                    {REFERRAL_MILESTONES.map(ms => {
                      const done = activeRefs.length >= ms.refs;
                      return (
                        <div key={ms.refs} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:20, height:20, borderRadius:'50%', background: done ? 'rgba(0,200,120,0.2)' : 'rgba(255,255,255,0.06)', border:`1px solid ${done ? 'rgba(0,200,120,0.5)' : 'rgba(255,255,255,0.1)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>{done ? '✓' : ''}</div>
                            <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:13, color: done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>{ms.refs} active refs</p>
                          </div>
                          <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:13, color: done ? 'rgba(0,220,140,0.9)' : 'rgba(100,200,255,0.7)' }}>{ms.reward}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Active / Inactive tabs */}
            {(refSubTab === 'active' || refSubTab === 'inactive') && (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
                {(refSubTab === 'active' ? activeRefs : inactiveRefs).length === 0 ? (
                  <div style={{ textAlign:'center', padding:'28px 0' }}>
                    <p style={{ fontSize:28, marginBottom:8 }}>{refSubTab === 'active' ? '🔗' : '⏳'}</p>
                    <p style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'rgba(255,255,255,0.25)' }}>No {refSubTab} referrals yet</p>
                  </div>
                ) : (refSubTab === 'active' ? activeRefs : inactiveRefs).map((ref: any, i: number) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'rgba(255,255,255,0.7)' }}>{ref.username}</p>
                        <span style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 4, fontFamily: 'Space Mono,monospace',
                          background: ref.active ? 'rgba(50,200,50,0.15)' : 'rgba(150,150,150,0.15)',
                          color: ref.active ? '#6bff6b' : '#888',
                          border: `1px solid ${ref.active ? 'rgba(50,200,50,0.3)' : 'rgba(150,150,150,0.2)'}`,
                        }}>
                          {ref.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:2 }}>
                        Joined {(ref.joined ?? ref.created_at ?? '').slice(0, 10) || 'recently'}
                      </p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:12, color:'rgba(0,220,140,0.8)' }}>{Number(ref.points ?? 0).toLocaleString()} pts</p>
                      <div style={{ display:'inline-block', padding:'2px 8px', borderRadius:6, background: ref.active ? 'rgba(0,200,120,0.15)' : 'rgba(255,100,100,0.1)', border:`1px solid ${ref.active ? 'rgba(0,200,120,0.3)' : 'rgba(255,100,100,0.2)'}`, marginTop:3 }}>
                        <p style={{ fontFamily:'Space Mono,monospace', fontSize:8, color: ref.active ? 'rgba(0,220,140,0.9)' : 'rgba(255,120,100,0.8)', letterSpacing:'1px' }}>{ref.active ? 'ACTIVE' : 'PENDING'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* ── Coupon modal ── */}
      {couponOpen && (
        <BottomSheet onClose={closeCoupon}>
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <span style={{ fontSize:26 }}>🎟️</span>
              <div>
                <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:16, color:'white' }}>REDEEM CODE</p>
                <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:2 }}>Enter your coupon to claim rewards</p>
              </div>
            </div>

            {couponMsg && (
              <div style={{ padding:'12px 16px', borderRadius:12, background: couponMsg.ok ? 'rgba(0,200,120,0.1)' : 'rgba(255,80,80,0.1)', border:`1px solid ${couponMsg.ok ? 'rgba(0,200,120,0.3)' : 'rgba(255,80,80,0.3)'}`, marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:16 }}>{couponMsg.ok ? '✅' : '❌'}</span>
                <p style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:600, fontSize:14, color: couponMsg.ok ? 'rgba(0,220,140,0.9)' : '#ff9090' }}>{couponMsg.text}</p>
              </div>
            )}

            {!loggedIn && (
              <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(255,200,80,0.08)', border:'1px solid rgba(255,200,80,0.2)', marginBottom:14, textAlign:'center' }}>
                <p style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:600, fontSize:14, color:'rgba(255,200,80,0.8)' }}>Connect your wallet to redeem codes</p>
              </div>
            )}

            <input
              value={couponInput}
              onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponMsg(null); }}
              onKeyDown={e => e.key === 'Enter' && handleRedeem()}
              placeholder="ENTER CODE HERE"
              disabled={!loggedIn}
              style={{ width:'100%', padding:'16px', borderRadius:12, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'white', fontFamily:'Space Mono,monospace', fontSize:15, letterSpacing:4, outline:'none', marginBottom:12, boxSizing:'border-box', textAlign:'center', opacity: loggedIn ? 1 : 0.5 }}
            />

            <div style={{ display:'flex', gap:10, marginBottom:8 }}>
              <button onClick={closeCoupon} style={{ flex:1, padding:14, borderRadius:12, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontFamily:'Orbitron,sans-serif', fontSize:12, cursor:'pointer' }}>
                CANCEL
              </button>
              <button onClick={handleRedeem} disabled={!loggedIn || redeeming} style={{ flex:2, padding:14, borderRadius:12, background: loggedIn ? 'white' : 'rgba(255,255,255,0.2)', border:'none', color:'black', fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:13, cursor: loggedIn ? 'pointer' : 'not-allowed', opacity: redeeming ? 0.7 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {redeeming ? <><SpinIcon /> REDEEMING…</> : 'REDEEM'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      <LegalModal modal={modal} setModal={setModal} />
      </>
      )}
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Dim({ children }: { children: ReactNode }) {
  return <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>{children}</span>;
}

function YouBadge() {
  return (
    <span style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:11, color:'rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, padding:'3px 9px', flexShrink:0, letterSpacing:'0.5px' }}>
      YOU
    </span>
  );
}

function SpinIcon() {
  return <span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'#000', borderRadius:'50%', animation:'_spin2 0.7s linear infinite' }} />;
}

function ActionCard({ onClick, icon, label, sub, accent, bg, border }: {
  onClick: () => void; icon: string; label: string; sub: string;
  accent: string; bg: string; border: string;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{ background: pressed ? bg.replace('0.08','0.14') : bg, border:`1px solid ${border}`, borderRadius:14, padding:'16px', cursor:'pointer', textAlign:'left', transform: pressed ? 'scale(0.97)' : 'scale(1)', transition:'all 0.15s', WebkitTapHighlightColor:'transparent' as any }}
    >
      <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
      <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:10, color:accent, letterSpacing:'1px' }}>{label}</p>
      <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:3 }}>{sub}</p>
    </button>
  );
}

function PodiumCard({ row, rank, tab, email, username, color, height, crown }: {
  row: any; rank: number; tab: 'points' | 'referrals';
  email?: string | null; username?: string | null;
  color: string; height: number; crown?: boolean;
}) {
  const score  = tab === 'points' ? row.points : row.referral_count;
  const reward = tab === 'points' ? POINTS_REWARDS[rank] : undefined;
  const isMe   = !!(email && (row.email === email || row.username === username));
  const sz     = rank === 1 ? 72 : rank === 2 ? 60 : 54;

  const platformColors: Record<number, { bg: string; border: string; glow: string }> = {
    1: { bg:'rgba(255,215,0,0.08)',   border:'rgba(255,215,0,0.25)',   glow:'rgba(255,215,0,0.3)'   },
    2: { bg:'rgba(192,192,192,0.06)', border:'rgba(192,192,192,0.15)', glow:'transparent'           },
    3: { bg:'rgba(205,127,50,0.06)',  border:'rgba(205,127,50,0.15)',  glow:'transparent'           },
  };
  const pc = platformColors[rank];

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      {crown && <span style={{ fontSize:22 }}>👑</span>}
      {!crown && <div style={{ height:22 }}/>}

      {/* Avatar */}
      <div style={{ position:'relative', width:sz, height:sz }}>
        <div style={{ width:sz, height:sz, borderRadius:'50%', background: row.avatar_color ?? '#555', border:`3px solid ${color}`, boxShadow: rank===1 ? `0 0 20px ${pc.glow}` : 'none', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize: rank===1?24:rank===2?18:16, color:'white' }}>
          {(row.username ?? '?')[2]?.toUpperCase()}
        </div>
        <div style={{ position:'absolute', bottom:-4, right:-4, width: rank===1?24:rank===2?22:20, height: rank===1?24:rank===2?22:20, borderRadius:'50%', background:color, border:'2px solid #000', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize: rank===1?11:10, color:'#000' }}>
          {rank}
        </div>
        {isMe && <div style={{ position:'absolute', top:-4, left:-4, width:14, height:14, borderRadius:'50%', background:'white', border:'2px solid #000', boxShadow:'0 0 8px rgba(255,255,255,0.6)' }}/>}
      </div>

      <p style={{ fontFamily:'Space Mono,monospace', fontSize:9, color: rank===1 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', textAlign:'center', lineHeight:1.4 }}>{row.username}</p>
      <p style={{ fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize: rank===1?14:12, color:'white', textAlign:'center' }}>
        {Number(score ?? 0).toLocaleString()}
        <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:9, color:'rgba(255,255,255,0.35)', marginLeft:3 }}>{tab==='points'?'PTS':'REF'}</span>
      </p>
      {reward && <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:10, color: rank===1?'#FFD700':rank===2?'#C0C0C0':'#CD7F32', textAlign:'center', lineHeight:1.3 }}>{reward}</p>}

      {/* Platform block */}
      <div style={{ width:'100%', background:pc.bg, border:`1px solid ${pc.border}`, borderRadius:'10px 10px 0 0', padding:'10px 4px', textAlign:'center', minHeight:height, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize: rank===1?26:rank===2?22:18, color: rank===1?'rgba(255,215,0,0.4)':rank===2?'rgba(192,192,192,0.35)':'rgba(205,127,50,0.35)' }}>{rank}</span>
      </div>
    </div>
  );
}
