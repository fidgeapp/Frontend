'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import TopHeader from '@/components/TopHeader';
import BottomNav from '@/components/BottomNav';
import LegalModal, { ModalType } from '@/components/LegalModal';
import { useAuth } from '@/context/AuthContext';
import { Shop as ShopApi, type FidgeSkin } from '@/lib/api';

const RARITY_COLOR: Record<string, string> = {
  Common:    'rgba(255,255,255,0.5)',
  Rare:      'rgba(100,180,255,0.9)',
  Epic:      'rgba(180,100,255,0.95)',
  Legendary: '#FFD700',
};
const RARITY_BG: Record<string, string> = {
  Common:    'rgba(255,255,255,0.05)',
  Rare:      'rgba(100,180,255,0.08)',
  Epic:      'rgba(180,100,255,0.08)',
  Legendary: 'rgba(255,215,0,0.08)',
};
const SKIN_BENEFITS: Record<string, string[]> = {
  'Obsidian': ['1.0x earnings multiplier', 'Standard energy drain', 'Free default skin'],
  'Chrome':   ['1.0x earnings multiplier', 'Standard energy drain', '30 💎 to unlock'],
  'Gold':     ['1.3x earnings — +30% pts', '15% slower energy drain', 'Spin 18% longer'],
  'Sapphire': ['1.4x earnings — +40% pts', '20% slower energy drain', 'Spin 25% longer'],
  'Neon':     ['1.6x earnings — +60% pts', '28% slower energy drain', 'Spin 39% longer'],
  'Plasma':   ['1.7x earnings — +70% pts', '35% slower energy drain', 'Spin 54% longer — best'],
};

function SpinnerThumb({ shade, imageUrl, size = 80 }: { shade: string; imageUrl?: string | null; size?: number }) {
  if (imageUrl) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={imageUrl} alt="skin" style={{ width: size, height: size, objectFit: 'contain', imageRendering: 'crisp-edges' }} />
      </div>
    );
  }
  const id = `g_${shade.replace(/[^a-z0-9]/gi, '_')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      <defs>
        <radialGradient id={id} cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor={shade} />
          <stop offset="100%" stopColor="#060606" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="55"  rx="42" ry="42" fill={`url(#${id})`} />
      <ellipse cx="62"  cy="165" rx="42" ry="42" fill={`url(#${id})`} />
      <ellipse cx="178" cy="165" rx="42" ry="42" fill={`url(#${id})`} />
      <path d="M90 88 L120 55 L150 88 L165 130 L120 150 L75 130 Z"  fill={`url(#${id})`} />
      <path d="M75 130 L62 165 L95 175 L120 150 Z"                   fill={`url(#${id})`} />
      <path d="M165 130 L178 165 L145 175 L120 150 Z"                fill={`url(#${id})`} />
      <circle cx="120" cy="120" r="28" fill="#080808" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <circle cx="120" cy="120" r="18" fill={`url(#${id})`} />
    </svg>
  );
}

// ── Login Gate ─────────────────────────────────────────────────────────────────
function LoginGate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>🔒</div>
      <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 10, letterSpacing: 1 }}>
        SIGN IN TO VIEW SHOP
      </p>
      <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 280, lineHeight: 1.6, marginBottom: 28 }}>
        Create an account or sign in to browse and purchase spinner skins with your gems.
      </p>
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '16px 20px', maxWidth: 300, width: '100%' }}>
        <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10 }}>WHAT YOU UNLOCK</p>
        {['Spinner skin collection', 'Gem balance & purchases', 'Skin multiplier bonuses', 'Buy Gems via marketplace'].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(100,180,255,0.7)', flexShrink: 0 }} />
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

export default function ShopPage() {
  const { loggedIn, gems, activeSkin, applyUserPatch } = useAuth();

  const SKIN_SHADES: Record<string, string> = {
    'Obsidian': '#1a1a1a', 'Chrome': '#c0c0c0', 'Gold': '#ffd700',
    'Sapphire': '#0f52ba', 'Plasma': '#8a2be2', 'Neon': '#39ff14',
  };
  const activeSkinShade = SKIN_SHADES[activeSkin ?? 'Obsidian'] ?? '#1a1a1a';
  const [loaded,  setLoaded]  = useState(false);
  const [modal,   setModal]   = useState<ModalType>(null);
  const [skins,   setSkins]   = useState<FidgeSkin[]>([]);
  const [buying,  setBuying]  = useState<number | null>(null);
  const [toast,   setToast]   = useState<{ text: string; ok: boolean } | null>(null);
  const [filter,  setFilter]  = useState<'all' | 'owned' | 'available'>('all');

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  const showToast = (text: string, ok: boolean) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSkins = useCallback(async () => {
    try {
      const shopRes = await ShopApi.skins();
      setSkins(shopRes.skins ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchSkins(); }, [fetchSkins]);
  useEffect(() => { fetchSkins(); }, [loggedIn]);

  const handleBuy = async (skin: FidgeSkin) => {
    if (!loggedIn) { showToast('Sign in first', false); return; }
    if (gems < skin.gem_cost) { showToast(`Need ${skin.gem_cost} 💎 gems (you have ${gems})`, false); return; }
    setBuying(skin.id);
    try {
      const res = await ShopApi.purchase(skin.id);
      applyUserPatch({ gems: res.gems });
      setSkins(prev => prev.map(s => s.id === skin.id ? { ...s, owned: true } : s));
      showToast(`✓ ${skin.name} skin unlocked!`, true);
    } catch (e: any) {
      showToast(e.message ?? 'Purchase failed', false);
    } finally {
      setBuying(null);
    }
  };

  const filtered = skins.filter(s => {
    if (filter === 'owned')     return s.owned || s.is_default;
    if (filter === 'available') return !s.owned && !s.is_default;
    return true;
  });

  return (
    <main style={{ minHeight: '100dvh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}} @keyframes _toastIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {!loaded && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ animation: '_spin 1s linear infinite' }}>
            <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
            <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" fill="none" strokeDasharray="40 85" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {loggedIn && activeSkin !== 'Obsidian' && (
        <div style={{ position: 'fixed', inset: 0, background: `radial-gradient(ellipse 160% 120% at 50% -10%, ${activeSkinShade}60 0%, ${activeSkinShade}20 40%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0, transition: 'background 0.8s ease' }} />
      )}
      <div className="dot-bg" style={{ position: 'absolute', inset: 0, opacity: .2, maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%,black,transparent)', WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%,black,transparent)', pointerEvents: 'none' }} />

      <TopHeader title="Shop" showConnect onMenuSelect={k => setModal(k as ModalType)} />

      {/* ── Login gate — hides all content if not signed in ── */}
      {!loggedIn ? (
        <LoginGate />
      ) : (
        <>
          {/* Gems balance */}
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', marginBottom: 4 }}>YOUR BALANCE</p>
                <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 22, color: 'white' }}>
                  {gems} <span style={{ fontSize: 16 }}>💎</span>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Convert points to gems in your Profile</p>
                <a
                  href="/marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 8, padding: '6px 14px', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 8, fontFamily: 'Orbitron,sans-serif', fontSize: 10, fontWeight: 700, color: '#60a5fa', letterSpacing: 1, textDecoration: 'none' }}
                >
                  💎 BUY GEMS →
                </a>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, padding: '14px 16px 0' }}>
            {(['all', 'owned', 'available'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '7px 16px', borderRadius: 999, background: filter === f ? 'white' : 'rgba(255,255,255,0.06)', border: `1px solid ${filter === f ? 'white' : 'rgba(255,255,255,0.1)'}`, color: filter === f ? 'black' : 'rgba(255,255,255,0.5)', fontFamily: 'Space Mono,monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', cursor: 'pointer', textTransform: 'uppercase' }}>
                {f}
              </button>
            ))}
          </div>

          {/* Section title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px 12px' }}>
            <div style={{ width: 3, height: 18, background: 'white', borderRadius: 2 }} />
            <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 13, color: 'white', letterSpacing: '1px' }}>SPINNER SKINS</p>
            <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{filtered.length} skins</p>
          </div>

          {/* Skin grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 16px', paddingBottom: 110 }}>
            {filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                  {skins.length === 0 ? 'Loading skins…' : 'No skins in this category'}
                </p>
              </div>
            ) : filtered.map(skin => {
              const isOwned   = skin.owned || skin.is_default;
              const isActive  = activeSkin === skin.name;
              const isBuying  = buying === skin.id;
              const canAfford = gems >= skin.gem_cost;
              return (
                <div key={skin.id} style={{ background: isActive ? 'rgba(255,255,255,0.08)' : RARITY_BG[skin.rarity] ?? 'rgba(255,255,255,0.04)', border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : isOwned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 18, padding: '18px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative', transition: 'all .2s' }}>
                  {isActive && (
                    <div style={{ position: 'absolute', top: 10, right: 10, background: 'white', borderRadius: 6, padding: '3px 8px' }}>
                      <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 8, color: 'black', fontWeight: 700 }}>ON</span>
                    </div>
                  )}
                  {isOwned && !isActive && (
                    <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,200,120,0.15)', border: '1px solid rgba(0,200,120,0.3)', borderRadius: 6, padding: '3px 8px' }}>
                      <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 8, color: 'rgba(0,220,140,0.9)', fontWeight: 700 }}>OWNED</span>
                    </div>
                  )}
                  <SpinnerThumb shade={skin.shade} imageUrl={skin.image_url} size={80} />
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 13, color: 'white', marginBottom: 4 }}>{skin.name}</p>
                    <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: RARITY_COLOR[skin.rarity] ?? 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>{skin.rarity?.toUpperCase()}</p>
                  </div>
                  {SKIN_BENEFITS[skin.name] && (
                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px' }}>
                      {SKIN_BENEFITS[skin.name].map((b, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: i < SKIN_BENEFITS[skin.name].length - 1 ? 4 : 0 }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: RARITY_COLOR[skin.rarity] ?? 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                          <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>{b}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {skin.is_default ? (
                    <div style={{ width: '100%', padding: '8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                      <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '1px' }}>FREE / DEFAULT</p>
                    </div>
                  ) : isOwned ? (
                    <div style={{ width: '100%', padding: '8px', borderRadius: 10, background: 'rgba(0,200,120,0.08)', border: '1px solid rgba(0,200,120,0.2)', textAlign: 'center' }}>
                      <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(0,220,140,0.7)', letterSpacing: '1px' }}>✓ UNLOCKED</p>
                    </div>
                  ) : (
                    <button onClick={() => handleBuy(skin)} disabled={isBuying}
                      style={{ width: '100%', padding: '10px', borderRadius: 11, background: canAfford ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${canAfford ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`, color: canAfford ? 'white' : 'rgba(255,255,255,0.3)', cursor: isBuying ? 'default' : 'pointer', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .2s' }}>
                      {isBuying ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: '_spin .7s linear infinite' }}>
                          <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
                          <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="2" fill="none" strokeDasharray="10 20" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <>{skin.gem_cost} 💎</>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: 16, right: 16, zIndex: 500, display: 'flex', justifyContent: 'center', animation: '_toastIn .3s ease' }}>
          <div style={{ background: toast.ok ? 'rgba(0,200,120,0.15)' : 'rgba(255,80,80,0.15)', border: `1px solid ${toast.ok ? 'rgba(0,200,120,0.4)' : 'rgba(255,80,80,0.4)'}`, borderRadius: 14, padding: '12px 20px', fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: 15, color: toast.ok ? 'rgba(0,230,130,1)' : 'rgba(255,120,120,1)' }}>
            {toast.text}
          </div>
        </div>
      )}

      <BottomNav />
      <LegalModal type={modal} onClose={() => setModal(null)} />
    </main>
  );
}
