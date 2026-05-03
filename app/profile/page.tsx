'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import TopHeader from '@/components/TopHeader';
import { useAuth } from '@/context/AuthContext';
import LegalModal, { ModalType } from '@/components/LegalModal';
import { Profile as ProfileApi } from '@/lib/api';
import ProfileContent from './ProfileContent';


const SKIN_BENEFITS: Record<string, string[]> = {
  'Obsidian': ['1.0x multiplier', 'Default skin', 'Free'],
  'Chrome':   ['1.0x multiplier', 'Metallic look', 'Free'],
  'Gold':     ['1.3x multiplier', '+30% points', 'Rare'],
  'Sapphire': ['1.4x multiplier', '+40% points', 'Rare'],
  'Neon':     ['1.6x multiplier', '+60% points', 'Epic'],
  'Plasma':   ['1.7x multiplier', '+70% points', 'Max power'],
};
// Skins are now loaded from backend (see useState ownedSkins below)
const RARITY_COLORS: Record<string, string> = {
  Common: 'rgba(255,255,255,0.4)', Rare: 'rgba(255,255,255,0.65)',
  Epic: 'rgba(255,255,255,0.85)', Legendary: '#ffffff',
};
function SpinnerThumb({ shade, imageUrl }: { shade: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={imageUrl} alt="skin" style={{ width: 40, height: 40, objectFit: 'contain' }} />
      </div>
    );
  }
  const id = `gp_${shade.replace('#','')}`;
  return (
    <svg width="56" height="56" viewBox="0 0 240 240" fill="none">
      <defs>
        <radialGradient id={id} cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor={shade}/><stop offset="100%" stopColor="#060606"/>
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="55"  rx="42" ry="42" fill={`url(#${id})`}/>
      <ellipse cx="62"  cy="165" rx="42" ry="42" fill={`url(#${id})`}/>
      <ellipse cx="178" cy="165" rx="42" ry="42" fill={`url(#${id})`}/>
      <path d="M90 88 L120 55 L150 88 L165 130 L120 150 L75 130 Z" fill={`url(#${id})`}/>
      <path d="M75 130 L62 165 L95 175 L120 150 Z" fill={`url(#${id})`}/>
      <path d="M165 130 L178 165 L145 175 L120 150 Z" fill={`url(#${id})`}/>
      <circle cx="120" cy="120" r="28" fill="#080808" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
      <circle cx="120" cy="120" r="18" fill={`url(#${id})`}/>
    </svg>
  );
}

// Quests are now loaded from backend (see useState quests below)

const POINTS_PER_GEM   = 10000;
const MIN_WITHDRAW_PCEDO = 100;  // minimum 100 $PCEDO per withdrawal

type ShopModal = 'skins' | 'convert' | 'withdraw' | null;

export default function ProfilePage() {
  const { loggedIn, username, email, avatarColor, points, spinPoints, questPoints, pcedoEarned, gems, activeSkin, applyUserPatch, refreshFromServer } = useAuth();
  const [loaded, setLoaded]         = useState(false);
  const [shopModal, setShopModal]   = useState<ShopModal>(null);
  const [convertAmt, setConvertAmt] = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('100');
  const [withdrawWallet, setWithdrawWallet] = useState('');
  const [withdrawals,    setWithdrawals]    = useState<any[]>([]);
  const [wdLoading,      setWdLoading]      = useState(false);
  const [deleting,       setDeleting]       = useState<number | null>(null);
  const [convertMsg, setConvertMsg] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [modal, setModal]           = useState<ModalType>(null);
  const [ownedSkins, setOwnedSkins]  = useState<any[]>([]);
  const [quests,     setQuests]      = useState<any[]>([]);
  const [confirmingQuest, setConfirmingQuest] = useState<number | null>(null);
  const [questMsg,    setQuestMsg]    = useState<{text: string; ok: boolean} | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [equipping,      setEquipping]      = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setLoaded(true), 50); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (!loggedIn) return;
    setProfileLoading(true);
    // Refresh from server to get latest points/gems from spinning
    refreshFromServer().catch(() => {});
    ProfileApi.get()
      .then(d => {
        setOwnedSkins(d.owned_skins ?? []);
        setQuests(d.quests ?? []);
        // Sync active skin into AuthContext so it stays consistent
        if (d.user?.active_skin) applyUserPatch({ active_skin: d.user.active_skin });
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [loggedIn]);

  const r = 98;
  const circ = 2 * Math.PI * r;
  const progress = Math.min(points / 1000, 1);
  const offset   = circ - (Math.max(progress, 0.018) * circ);
  const completed = quests.filter((q: any) => q.pivot?.completed ?? q.completed ?? false).length;

  // Skin background: use active skin's image as blurry background tint
  const activeSkinData  = ownedSkins.find((s: any) => s.name === activeSkin);
  const skinShade       = activeSkinData?.shade ?? '#1a1a1a';
  const skinImageUrl    = activeSkinData?.image_url ?? null;

  /* Convert points → gems */
  const handleConvert = async (ptsToSpend?: number) => {
    const pts = ptsToSpend ?? parseFloat(convertAmt);
    if (!pts || pts < POINTS_PER_GEM) { setConvertMsg(`Minimum ${POINTS_PER_GEM} points required`); return; }
    if (pts > points) { setConvertMsg('Not enough points'); return; }
    try {
      const res = await ProfileApi.convertPoints(pts);
      applyUserPatch({ gems: res.gems, points: res.points });
      const gemsGot = Math.floor(pts / POINTS_PER_GEM);
      setConvertMsg(`✓ Converted ${pts.toLocaleString()} pts → ${gemsGot} 💎`);
      setConvertAmt('1');
      setTimeout(() => setConvertMsg(''), 3500);
    } catch (e: any) {
      setConvertMsg(e.message ?? 'Conversion failed');
    }
  };

  /* Withdraw PCEDO → ETH wallet */
  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmt);
    if (!amt || amt < MIN_WITHDRAW_PCEDO) { setWithdrawMsg(`Minimum ${MIN_WITHDRAW_PCEDO} $PCEDO to withdraw`); return; }
    if (amt > pcedoEarned) { setWithdrawMsg('Insufficient $PCEDO balance'); return; }
    if (!withdrawWallet.trim()) { setWithdrawMsg('Enter your ETH wallet address'); return; }
    try {
      const res = await ProfileApi.withdrawPcedo(amt, withdrawWallet.trim());
      applyUserPatch({ pcedo_earned: res.pcedo_earned });
      setWithdrawMsg(res.message ?? `✓ Withdrawal of ${amt} $PCEDO submitted!`);
      setWithdrawAmt('');
      setWithdrawWallet('');
      setTimeout(() => setWithdrawMsg(''), 5000);
    } catch (e: any) {
      setWithdrawMsg(e.message ?? 'Withdrawal failed');
    }
  };

  const loadWithdrawals = async () => {
    setWdLoading(true);
    try {
      const res = await ProfileApi.myWithdrawals();
      setWithdrawals(res.withdrawals ?? []);
    } catch {} finally { setWdLoading(false); }
  };

  const handleDeleteWithdrawal = async (id: number) => {
    setDeleting(id);
    try {
      const res = await ProfileApi.deleteWithdrawal(id);
      applyUserPatch({ pcedo_earned: res.pcedo_earned });
      setWithdrawals(prev => prev.filter(w => w.id !== id));
      setWithdrawMsg(res.message);
      setTimeout(() => setWithdrawMsg(''), 4000);
    } catch (e: any) {
      setWithdrawMsg(e.message ?? 'Delete failed');
    } finally { setDeleting(null); }
  };


  return (
    <main style={{ minHeight: '100vh', background: '#000', position: 'relative', overflow: 'hidden', WebkitTapHighlightColor: 'transparent' as any }}>
      <TopHeader title="Profile" showConnect onMenuSelect={(key) => setModal(key as ModalType)} />

      {!loaded && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ animation: '_spin 1s linear infinite' }}>
            <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none"/>
            <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" fill="none" strokeDasharray="40 85" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      <div className="dot-bg" style={{ position: 'absolute', inset: 0, opacity: 0.3, maskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 10%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 10%, transparent 80%)', pointerEvents: 'none' }}/>

      {/* Skin-tinted full-screen background */}
      {loggedIn && (
        <div style={{
          position: 'fixed', inset: 0,
          background: `radial-gradient(ellipse 160% 120% at 50% -10%, ${skinShade}60 0%, ${skinShade}20 40%, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 0.8s ease',
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Wallet banner */}
        {loggedIn && (
          <div style={{ margin: '16px 16px 0', background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: avatarColor ?? 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '14px', color: '#000', flexShrink: 0 }}>
              {username?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <p style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '15px', color: 'white' }}>Connected</p>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', boxShadow: '0 0 8px rgba(255,255,255,0.8)' }} className="pulse"/>
              </div>
              <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '11px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
            </div>
          </div>
        )}

        {/* Balance ring */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 24px 24px' }}>
          <div style={{ position: 'relative', width: '216px', height: '216px' }}>
            <svg width="216" height="216" viewBox="0 0 216 216" style={{ transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="rG" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.2)"/><stop offset="100%" stopColor="rgba(255,255,255,1)"/>
                </linearGradient>
              </defs>
              <circle cx="108" cy="108" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
              <circle cx="108" cy="108" r={r} fill="none" stroke="url(#rG)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' }}/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Space Mono,monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', marginBottom: '8px' }}>TOTAL</span>
              <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: '34px', color: 'white', lineHeight: 1 }}>{points.toFixed(2)}</span>
              <span style={{ fontFamily: 'Space Mono,monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', marginTop: '8px' }}>POINTS</span>
            </div>
          </div>
        </div>

        {/* 🎡 Spin the Wheel button */}
        <div style={{ padding: '0 16px 4px', marginBottom: '16px' }}>
          <a href="/wheel" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(255,100,0,0.15), rgba(255,200,0,0.1), rgba(0,200,100,0.1), rgba(0,100,255,0.15))', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ fontSize: '32px', filter: 'drop-shadow(0 0 8px rgba(255,180,0,0.6))' }}>🛞</div>
                <div>
                  <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 800, fontSize: '14px', color: 'white', letterSpacing: '1px', marginBottom: '3px' }}>SPIN THE WHEEL</p>
                  <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Win points, gems & a skin · <span style={{ color: 'rgba(255,200,80,0.9)', fontWeight: 700 }}>2 💎 per spin</span></p>
                </div>
              </div>
              <div style={{ width: '28px', height: '28px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '16px', flexShrink: 0 }}>›</div>
            </div>
          </a>
        </div>

        {/* Stat cards + action buttons beneath */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '0 16px 20px' }}>

          {/* Spinning */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>↺</div>
              <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase' }}>Spinning</p>
              <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '18px', color: 'white', lineHeight: 1 }}>{spinPoints.toFixed(2)}</p>
              <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>From spinner</p>
            </div>
            {loggedIn && (
              <button onClick={() => setShopModal('convert')} style={{ width: '100%', padding: '9px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '13px', color: 'white', WebkitTapHighlightColor: 'transparent' as any }}>
                Convert
              </button>
            )}
          </div>

          {/* Gems */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>💎</div>
              <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase' }}>Gems</p>
              <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '18px', color: 'white', lineHeight: 1 }}>{gems}</p>
              <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>Available</p>
            </div>
            {loggedIn && (
              <button onClick={() => setShopModal('skins')} style={{ width: '100%', padding: '9px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '13px', color: 'white', WebkitTapHighlightColor: 'transparent' as any }}>
                Skins
              </button>
            )}
          </div>

          {/* PCEDO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>$</div>
              <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase' }}>PCEDO</p>
              <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '18px', color: 'white', lineHeight: 1 }}>${pcedoEarned.toFixed(2)}</p>
              <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>Total earned</p>
            </div>
            {loggedIn && (
              <button onClick={() => setShopModal('withdraw')} style={{ width: '100%', padding: '9px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '13px', color: 'white', WebkitTapHighlightColor: 'transparent' as any }}>
                Withdraw
              </button>
            )}
          </div>

        </div>

        {/* Quests */}
        {loggedIn ? (
          <div style={{ padding: '0 16px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '3px', height: '18px', background: 'white', borderRadius: '2px', boxShadow: '0 0 8px rgba(255,255,255,0.6)' }}/>
                <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 800, fontSize: '15px', color: 'white', letterSpacing: '2px' }}>QUESTS</span>
              </div>
              <span style={{ fontFamily: 'Space Mono,monospace', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{completed}/{quests.length} done</span>
            </div>
            {questMsg && (
              <div style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 10, fontSize: 13,
                background: questMsg.ok ? '#112a11' : '#2a1111',
                border: `1px solid ${questMsg.ok ? '#205a20' : '#5a2020'}`,
                color: questMsg.ok ? '#6bff6b' : '#ff6b6b' }}>
                {questMsg.text}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {quests.map(q => {
                const isDone = q.pivot?.completed ?? q.completed ?? false;
                const isAuto = ['first_spin', 'marathon', 'speed_demon', 'daily_grind'].includes(q.type) &&
                               !q.title?.toLowerCase().includes('wheel');
                const isConfirming = confirmingQuest === q.id;
                return (
                  <div key={q.id} style={{
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${isDone ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14, padding: '14px 16px', opacity: isDone ? 1 : 0.85,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Status icon */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: isDone ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isDone ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, color: 'white',
                      }}>
                        {isDone ? '✓' : isAuto ? '🔄' : '○'}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 15, color: 'white' }}>{q.title}</p>
                        <p style={{ fontFamily: 'Rajdhani', fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                          {q.description ?? ''}
                          {isAuto && !isDone && <span style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}> (auto-detected)</span>}
                        </p>
                      </div>
                      {/* Reward */}
                      <div style={{
                        background: isDone ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                        padding: '6px 10px', textAlign: 'center', flexShrink: 0,
                      }}>
                        <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 13, color: isDone ? 'white' : 'rgba(255,255,255,0.4)' }}>
                          +{q.reward_points}
                        </p>
                        <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 1 }}>PTS</p>
                      </div>
                    </div>

                    {/* Confirm button — only for non-auto, non-completed quests */}
                    {!isDone && !isAuto && (
                      <button
                        disabled={isConfirming}
                        onClick={async () => {
                          setConfirmingQuest(q.id);
                          setQuestMsg(null);
                          try {
                            const res = await ProfileApi.confirmQuest(q.id);
                            setQuests(prev => prev.map(x => x.id === q.id
                              ? { ...x, pivot: { completed: true, completed_at: new Date().toISOString() } }
                              : x
                            ));
                            applyUserPatch({ points: res.points, quest_points: res.quest_points });
                            setQuestMsg({ text: res.message, ok: true });
                          } catch (e: any) {
                            setQuestMsg({ text: e.message ?? 'Could not confirm quest', ok: false });
                          } finally {
                            setConfirmingQuest(null);
                          }
                        }}
                        style={{
                          marginTop: 12, width: '100%', padding: '10px 0',
                          background: isConfirming ? '#1a1a1a' : 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 10, color: isConfirming ? '#555' : '#fff',
                          fontSize: 13, fontWeight: 600, cursor: isConfirming ? 'not-allowed' : 'pointer',
                          fontFamily: 'Rajdhani, sans-serif', letterSpacing: 1,
                        }}
                      >
                        {isConfirming ? 'Confirming…' : '✓ Confirm Completion'}
                      </button>
                    )}
                    {isDone && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'Space Mono,monospace' }}>COMPLETED</span>
                        <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.08)' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ margin: '0 16px 32px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '15px', opacity: 0.5 }}>⚠</span>
            <p style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Sign in to see your stats & quests</p>
          </div>
        )}
      </div>

      {/* ── GEM SHOP MODAL ── */}
      {shopModal && (
        <div onClick={() => setShopModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: 'calc(85vh - 80px)', marginBottom: '80px', background: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '16px', color: 'white', letterSpacing: '1px' }}>💎 Gem Shop</span>
              <button onClick={() => setShopModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '20px', cursor: 'pointer', padding: '4px', WebkitTapHighlightColor: 'transparent' as any }}>✕</button>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', margin: '16px 20px 0', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', gap: '4px', flexShrink: 0 }}>
              {(['skins', 'convert', 'withdraw'] as ShopModal[]).map(tab => (
                <button key={tab} onClick={() => setShopModal(tab)} style={{ flex: 1, padding: '10px', background: shopModal === tab ? 'rgba(255,255,255,0.12)' : 'none', border: shopModal === tab ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent', borderRadius: '9px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '13px', color: shopModal === tab ? 'white' : 'rgba(255,255,255,0.35)', WebkitTapHighlightColor: 'transparent' as any, textTransform: 'capitalize' }}>
                  {tab === 'skins' ? '👕 Skins' : tab === 'convert' ? '🔄 Convert' : '💸 Withdraw'}
                </button>
              ))}
            </div>

            <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>

              {/* ── CONVERT TAB ── */}
              {shopModal === 'convert' && (() => {
                const convertOptions = [1,2,3,5,10].map(g => ({ gems: g, pts: g * POINTS_PER_GEM }));
                const selGems = parseInt(convertAmt) || 1;
                const selPts  = selGems * POINTS_PER_GEM;
                const canConvert = points >= selPts;
                return (
                <div>
                  {/* Balance */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '4px' }}>RATE</p>
                      <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '16px', color: 'white' }}>10,000 pts = 1 💎</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '4px' }}>YOUR POINTS</p>
                      <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '18px', color: 'white' }}>{points.toFixed(0)}</p>
                    </div>
                  </div>

                  {/* Stepper */}
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '12px' }}>SELECT AMOUNT</p>
                  <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 16, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)' }}>
                    <button
                      onClick={() => setConvertAmt(String(Math.max(1, selGems - 1)))}
                      style={{ width: 64, background: 'rgba(255,255,255,0.08)', border: 'none', borderRight: '1px solid rgba(255,255,255,0.18)', color: 'white', fontSize: 22, fontWeight: 300, cursor: selGems > 1 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: selGems > 1 ? 1 : 0.35 }}>
                      −
                    </button>
                    <div style={{ flex: 1, textAlign: 'center', background: 'white', padding: '10px 0' }}>
                      <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 24, color: '#111', lineHeight: 1 }}>{selGems}</p>
                      <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 3, fontWeight: 600 }}>💎 GEMS</p>
                    </div>
                    <button
                      onClick={() => setConvertAmt(String(selGems + 1))}
                      style={{ width: 64, background: 'rgba(255,255,255,0.08)', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.18)', color: 'white', fontSize: 22, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      +
                    </button>
                  </div>

                  {/* Quick select */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' as const }}>
                    {convertOptions.map(o => (
                      <button key={o.gems} onClick={() => setConvertAmt(String(o.gems))}
                        style={{ flex: 1, minWidth: 48, padding: '8px 4px', background: selGems === o.gems ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${selGems === o.gems ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center' }}>
                        <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 13, color: 'white' }}>{o.gems} 💎</p>
                      </button>
                    ))}
                  </div>

                  {/* Cost preview */}
                  <div style={{ background: canConvert ? 'rgba(80,200,80,0.08)' : 'rgba(255,80,80,0.06)', border: `1px solid ${canConvert ? 'rgba(80,200,80,0.2)' : 'rgba(255,80,80,0.15)'}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontFamily: 'Rajdhani', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Cost</p>
                      <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '16px', color: canConvert ? 'white' : 'rgba(255,100,100,0.8)' }}>{selPts.toLocaleString()} pts</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'Rajdhani', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Receive</p>
                      <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '16px', color: 'white' }}>{selGems} 💎</p>
                    </div>
                  </div>

                  {convertMsg && <p style={{ fontFamily: 'Rajdhani', fontSize: '14px', color: convertMsg.startsWith('✓') ? 'rgb(80,200,80)' : 'rgb(255,100,100)', marginBottom: '12px' }}>{convertMsg}</p>}

                  <button
                    onClick={async () => {
                      const pts = selGems * POINTS_PER_GEM;
                      if (!pts || pts < POINTS_PER_GEM) { setConvertMsg(`Minimum ${POINTS_PER_GEM} points required`); return; }
                      if (pts > points) { setConvertMsg('Not enough points'); return; }
                      try {
                        const res = await ProfileApi.convertPoints(pts);
                        applyUserPatch({ gems: res.gems, points: res.points });
                        setConvertMsg(`✓ Converted ${pts.toLocaleString()} pts → ${selGems} 💎`);
                        setTimeout(() => setConvertMsg(''), 3500);
                      } catch (e: any) { setConvertMsg(e.message ?? 'Conversion failed'); }
                    }}
                    disabled={!canConvert}
                    style={{ width: '100%', padding: '15px', background: canConvert ? 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))' : 'rgba(255,255,255,0.04)', border: `1px solid ${canConvert ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', cursor: canConvert ? 'pointer' : 'not-allowed', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '14px', color: canConvert ? 'white' : 'rgba(255,255,255,0.3)', letterSpacing: '1px', WebkitTapHighlightColor: 'transparent' as any }}>
                    CONVERT TO GEMS
                  </button>
                </div>
                );
              })()}

              {/* ── WITHDRAW TAB ── */}
              {shopModal === 'withdraw' && (() => {
                // load on first open
                if (!wdLoading && withdrawals.length === 0) loadWithdrawals();
                return (
                <div>
                  {/* Balance card */}
                  <div style={{ background: 'rgba(150,80,255,0.06)', border: '1px solid rgba(150,80,255,0.2)', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div>
                        <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '4px' }}>YOUR BALANCE</p>
                        <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '22px', color: 'white' }}>{pcedoEarned.toFixed(4)}</p>
                        <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(150,80,255,0.8)', letterSpacing: '1px' }}>$PCEDO</p>
                      </div>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(150,80,255,0.15)', border: '1px solid rgba(150,80,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        🪙
                      </div>
                    </div>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '10px' }}/>
                    <p style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                      Minimum withdrawal: {MIN_WITHDRAW_PCEDO} $PCEDO · Sent to your ETH wallet within 24–48h
                    </p>
                  </div>

                  {/* Amount stepper */}
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '12px' }}>SELECT AMOUNT</p>
                  {(() => {
                    const wdOptions = [100,200,500,1000,2000];
                    const selPcedo = parseFloat(withdrawAmt) || 100;
                    return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 12, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(150,80,255,0.35)' }}>
                        <button onClick={() => setWithdrawAmt(String(Math.max(1, selPcedo - 1)))}
                          style={{ width: 64, background: 'rgba(150,80,255,0.1)', border: 'none', borderRight: '1px solid rgba(150,80,255,0.35)', color: 'white', fontSize: 22, fontWeight: 300, cursor: selPcedo > 1 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: selPcedo > 1 ? 1 : 0.35 }}>
                          −
                        </button>
                        <div style={{ flex: 1, textAlign: 'center', background: 'white', padding: '10px 0' }}>
                          <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 24, color: '#111', lineHeight: 1 }}>{selPcedo}</p>
                          <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 3, fontWeight: 600 }}>$PCEDO</p>
                        </div>
                        <button onClick={() => setWithdrawAmt(String(selPcedo + 1))}
                          style={{ width: 64, background: 'rgba(150,80,255,0.1)', border: 'none', borderLeft: '1px solid rgba(150,80,255,0.35)', color: 'white', fontSize: 22, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          +
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' as const }}>
                        {wdOptions.map(o => (
                          <button key={o} onClick={() => setWithdrawAmt(String(o))}
                            style={{ flex: 1, minWidth: 52, padding: '8px 4px', background: selPcedo === o ? 'rgba(150,80,255,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${selPcedo === o ? 'rgba(150,80,255,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center' }}>
                            <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 12, color: 'white' }}>{o}</p>
                          </button>
                        ))}
                      </div>
                    </>
                    );
                  })()}

                  {/* Wallet address input */}
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '8px' }}>YOUR ETH WALLET ADDRESS</p>
                  <input
                    type="text"
                    value={withdrawWallet}
                    onChange={e => setWithdrawWallet(e.target.value)}
                    placeholder="0x..."
                    style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#60a5fa', fontFamily: 'Space Mono,monospace', fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
                  />

                  {/* Preview */}
                  {withdrawAmt && parseFloat(withdrawAmt) >= MIN_WITHDRAW_PCEDO && (() => { const sp = parseFloat(withdrawAmt); const fee = sp * 0.005; const net = sp - fee; return (
                    <div style={{ background: 'rgba(150,80,255,0.08)', border: '1px solid rgba(150,80,255,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px' }}>
                      <p style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Withdrawal breakdown</p>
                      {[['Gross', `${sp.toFixed(2)} $PCEDO`], ['0.5% fee', `− ${fee.toFixed(4)} $PCEDO`], ['You receive', `${net.toFixed(4)} $PCEDO`]].map(([l,v], i) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < 2 ? 4 : 0 }}>
                          <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{l}</span>
                          <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: i === 2 ? 700 : 400, fontSize: i === 2 ? 14 : 11, color: i === 2 ? '#a78bfa' : 'rgba(255,255,255,0.45)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  );})()}

                  {withdrawMsg && (
                    <p style={{ fontFamily: 'Rajdhani', fontSize: '14px', color: withdrawMsg.startsWith('✓') || withdrawMsg.includes('submitted') ? 'rgb(100,200,130)' : 'rgb(255,100,100)', marginBottom: '12px', lineHeight: 1.4 }}>{withdrawMsg}</p>
                  )}

                  <button
                    onClick={handleWithdraw}
                    style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, rgba(150,80,255,0.25), rgba(150,80,255,0.1))', border: '1px solid rgba(150,80,255,0.4)', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '14px', color: 'white', letterSpacing: '1px', WebkitTapHighlightColor: 'transparent' as any }}>
                    WITHDRAW $PCEDO
                  </button>

                  {/* Withdrawal history */}
                  <div style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>WITHDRAWAL HISTORY</p>
                      <button onClick={loadWithdrawals} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 11, fontFamily: 'Space Mono,monospace' }}>
                        ↻ Refresh
                      </button>
                    </div>

                    {wdLoading ? (
                      <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
                    ) : withdrawals.length === 0 ? (
                      <p style={{ fontFamily: 'Rajdhani', fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '20px 0' }}>No withdrawal requests yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {withdrawals.map((w: any) => {
                          const statusColor = w.status === 'processed' ? '#34d399' : w.status === 'rejected' ? '#f87171' : '#f59e0b';
                          const statusBg    = w.status === 'processed' ? 'rgba(52,211,153,0.08)' : w.status === 'rejected' ? 'rgba(248,113,113,0.08)' : 'rgba(245,158,11,0.08)';
                          const statusLabel = w.status === 'processed' ? '✓ Processed' : w.status === 'rejected' ? '✗ Rejected' : '⏳ Pending';
                          return (
                            <div key={w.id} style={{ background: statusBg, border: `1px solid ${statusColor}30`, borderRadius: 12, padding: '12px 14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                <div>
                                  <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                                    {parseFloat(w.amount).toFixed(4)} <span style={{ color: statusColor }}>$PCEDO</span>
                                  </p>
                                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                                    {new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                </div>
                                <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, fontWeight: 700, color: statusColor, background: statusBg, border: `1px solid ${statusColor}40`, borderRadius: 6, padding: '3px 8px' }}>
                                  {statusLabel}
                                </span>
                              </div>
                              <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(96,165,250,0.7)', wordBreak: 'break-all', marginBottom: 8 }}>
                                → {w.wallet_address}
                              </p>
                              {w.status === 'pending' && (
                                <button
                                  onClick={() => handleDeleteWithdrawal(w.id)}
                                  disabled={deleting === w.id}
                                  style={{ width: '100%', padding: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, color: deleting === w.id ? 'rgba(255,255,255,0.3)' : '#f87171', cursor: deleting === w.id ? 'not-allowed' : 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 13, WebkitTapHighlightColor: 'transparent' as any }}>
                                  {deleting === w.id ? 'Cancelling…' : '✕ Cancel & Refund'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
                );
              })()}
              {/* ── SKINS TAB ── */}
              {shopModal === 'skins' && (
                <div>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '16px' }}>YOUR SKINS</p>
                  {ownedSkins.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.4 }}>👕</div>
                      <p style={{ fontFamily: 'Rajdhani', fontSize: '15px', color: 'rgba(255,255,255,0.3)' }}>No skins owned yet</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {ownedSkins.map(skin => (
                        <div key={skin.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <SpinnerThumb shade={skin.shade} imageUrl={skin.image_url} />
                          <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '12px', color: 'white', letterSpacing: '1px' }}>{skin.name}</p>
                          <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '8px', color: RARITY_COLORS[skin.rarity], letterSpacing: '1px' }}>{skin.rarity.toUpperCase()}</p>
                          {SKIN_BENEFITS[skin.name] && (
                            <div style={{ width: '100%', marginTop: 4 }}>
                              {SKIN_BENEFITS[skin.name].map((b: string, i: number) => (
                                <p key={i} style={{ fontFamily: 'Rajdhani', fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, textAlign: 'center' }}>· {b}</p>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={async () => {
                              setEquipping(skin.name);
                              try {
                                await ProfileApi.setSkin(skin.name);
                                applyUserPatch({ active_skin: skin.name });
                              } catch {}
                              setEquipping(null);
                            }}
                            disabled={equipping === skin.name || activeSkin === skin.name}
                            style={{ width: '100%', padding: '8px', background: activeSkin === skin.name ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${activeSkin === skin.name ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '8px', cursor: activeSkin === skin.name ? 'default' : 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '12px', color: 'white', WebkitTapHighlightColor: 'transparent' as any }}
                          >
                            {equipping === skin.name ? 'Equipping...' : activeSkin === skin.name ? '✓ Active' : 'Equip'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <LegalModal type={modal} onClose={() => setModal(null)} />
    </main>
  );
}
