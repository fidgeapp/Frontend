'use client';
export const dynamic = 'force-dynamic';
import AdModal from '@/components/AdModal';
import { useEffect, useRef, useState, useCallback } from 'react';
import TopHeader from '@/components/TopHeader';
import { useAuth } from '@/context/AuthContext';
import { loadPersistedEnergy, saveEnergyCache } from '@/context/AuthContext';
import LegalModal, { ModalType } from '@/components/LegalModal';

const MAX_ADS = 5;
const AD_COOLDOWN_HOURS = 2; // 2hr cooldown between ads

function pad(n: number) { return String(Math.floor(n)).padStart(2, '0'); }
function fmtCooldown(secs: number): string {
  if (secs <= 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtCountdown(secs: number) {
  return `${Math.floor(secs / 3600)}h ${pad(Math.floor((secs % 3600) / 60))}m`;
}

export default function SpinnerPage() {
  const { loggedIn, points, energy, adsWatched, syncSpinner, watchAd, persistEnergy, activeSkin } = useAuth();

  const spinnerRef  = useRef<HTMLDivElement>(null);
  const animRef     = useRef<number>(0);
  const angleRef    = useRef(0);
  const speedRef    = useRef(0);
  const draggingRef = useRef(false);
  const lastPosRef  = useRef<{ x: number; y: number; t: number } | null>(null);
  const centerRef   = useRef({ x: 0, y: 0 });

  const energyRef      = useRef<number>(100);
  const adsWatchedRef  = useRef<number>(0);
  const localPtsRef    = useRef<number>(0);
  const pendingPtsRef  = useRef(0);
  const pendingEngRef  = useRef(0);
  const lastUIRef      = useRef(0);
  const seededRef      = useRef(false);

  const [localEnergy,     setLocalEnergy]     = useState(100);
  const [localAdsWatched, setLocalAdsWatched] = useState(0);
  const [localPoints,     setLocalPoints]     = useState(0);
  const [isSpinning,      setIsSpinning]      = useState(false);
  const [adPlaying,       setAdPlaying]       = useState(false);
  const [adCooldownSecs, setAdCooldownSecs]  = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loaded,          setLoaded]          = useState(false);
  const [modal,           setModal]           = useState<ModalType>(null);
  const [secsToReset,     setSecsToReset]     = useState(0);

  // ── Seed from persisted energy + server values ────────────────────────────
  // Runs when loggedIn state changes (login/logout)
  useEffect(() => {
    const persisted  = loadPersistedEnergy();
    const initEnergy = persisted ? persisted.energy : energy;
    const initAds    = persisted ? persisted.adsWatched : adsWatched;
    const initPts    = points;

    energyRef.current     = initEnergy;
    adsWatchedRef.current = initAds;
    localPtsRef.current   = initPts;
    seededRef.current     = true;

    setLocalEnergy(initEnergy);
    setLocalAdsWatched(initAds);
    setLocalPoints(initPts);

    // Restore 2-hour batch cooldown across page refreshes
    if (persisted?.cooldownUntil && persisted.cooldownUntil > Date.now()) {
      const remaining = Math.ceil((persisted.cooldownUntil - Date.now()) / 1000);
      setAdCooldownSecs(remaining);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // ── Persist energy to localStorage every 5s + on unmount ─────────────────
  useEffect(() => {
    if (!loggedIn) return;
    const id = setInterval(() => {
      saveEnergyCache(energyRef.current, adsWatchedRef.current);
    }, 5000);
    return () => {
      clearInterval(id);
      persistEnergy(energyRef.current, adsWatchedRef.current);
      if (pendingPtsRef.current > 0 || pendingEngRef.current > 0) {
        syncSpinner(pendingPtsRef.current, pendingEngRef.current).catch(() => {});
        pendingPtsRef.current = 0;
        pendingEngRef.current = 0;
      }
    };
  }, [loggedIn, persistEnergy, syncSpinner]);

  // ── Midnight countdown ────────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      setSecsToReset(Math.floor((midnight.getTime() - now.getTime()) / 1000));
    };
    calc();
    const id = setInterval(calc, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  // ── Track session start time to compute duration ─────────────────────────
  const sessionStartRef  = useRef<number | null>(null);
  const sessionTotalPts  = useRef(0);
  const sessionTotalEng  = useRef(0);

  // When spinning starts — record start time
  useEffect(() => {
    if (isSpinning) {
      if (!sessionStartRef.current) sessionStartRef.current = Date.now();
    } else {
      // Spinning just stopped — call sessionEnd if there was an active session
      if (sessionStartRef.current) {
        const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
        const pts = sessionTotalPts.current;
        const eng = sessionTotalEng.current;
        sessionStartRef.current = null;
        sessionTotalPts.current = 0;
        sessionTotalEng.current = 0;
        // Fire and forget — quest detection happens server-side
        import('@/lib/api').then(({ Spinner }) => {
          Spinner.sessionEnd(pts, eng).catch(() => {});
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  // ── Batch sync to backend every 2s ────────────────────────────────────────
  useEffect(() => {
    if (!loggedIn) return;
    const id = setInterval(async () => {
      const pts = pendingPtsRef.current;
      const eng = pendingEngRef.current;
      if (pts <= 0 && eng <= 0) return;
      pendingPtsRef.current = 0;
      pendingEngRef.current = 0;
      try {
        await syncSpinner(pts, eng);
        // Accumulate totals for sessionEnd
        sessionTotalPts.current += pts;
        sessionTotalEng.current += eng;
      } catch {
        pendingPtsRef.current += pts;
        pendingEngRef.current += eng;
      }
    }, 2000);
    return () => clearInterval(id);
  }, [loggedIn, syncSpinner]);

  // ── rAF loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      speedRef.current *= 0.994;  // smoother coast
      if (Math.abs(speedRef.current) < 0.04) speedRef.current = 0;

      const spd    = speedRef.current;
      const active = Math.abs(spd) > 0.1;

      if (active && energyRef.current > 0) {
        const dE = Math.abs(spd) * 0.0012 * drainModifier;
        const dP = dE * 1.5;

        energyRef.current   = Math.max(0, energyRef.current - dE);
        localPtsRef.current = localPtsRef.current + dP;
        pendingEngRef.current += dE;
        pendingPtsRef.current += dP;

        const now = Date.now();
        if (now - lastUIRef.current > 100) {
          lastUIRef.current = now;
          setLocalEnergy(Math.max(0, energyRef.current));
          setLocalPoints(localPtsRef.current);
          setIsSpinning(true);
        }
      } else {
        if (!active) setIsSpinning(false);
      }

      angleRef.current += spd;
      if (spinnerRef.current)
        spinnerRef.current.style.transform = `rotate(${angleRef.current}deg)`;

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pointer input ─────────────────────────────────────────────────────────
  const getAngle = (x: number, y: number) =>
    Math.atan2(y - centerRef.current.y, x - centerRef.current.x) * (180 / Math.PI);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!loggedIn || energyRef.current <= 0) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    centerRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    draggingRef.current = true;
    lastPosRef.current  = { x: e.clientX, y: e.clientY, t: Date.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !lastPosRef.current) return;
    const dt    = Math.max(1, Date.now() - lastPosRef.current.t);
    let delta   = getAngle(e.clientX, e.clientY) - getAngle(lastPosRef.current.x, lastPosRef.current.y);
    if (delta >  180) delta -= 360;
    if (delta < -180) delta += 360;
    speedRef.current   = Math.max(-22, Math.min(22, (delta / dt) * 14));
    lastPosRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };

  const onPointerUp = () => { draggingRef.current = false; lastPosRef.current = null; };

  // ── Watch Ad ──────────────────────────────────────────────────────────────
  const [adCountdown,    setAdCountdown]    = useState(0);
  const [adModalOpen,    setAdModalOpen]    = useState(false);


  // Opens the AdModal AND fires Adsterra Popunder directly on click
  // Popunder MUST be triggered inside a direct user click — browsers block it from useEffect
  const handleWatchAd = useCallback(() => {
    // Block if: actively playing, cooldown running, OR batch full WITH cooldown still active
    // Allow through when cooldown=0 even if ref=5 (backend will reset the count)
    if (adPlaying || adCooldownSecs > 0) return;
    if (adsWatchedRef.current >= MAX_ADS && adCooldownSecs > 0) return;

    // Fire Adsterra Popunder directly from click event (browser allows this)
    const popunderSrc = process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER;
    const provider    = process.env.NEXT_PUBLIC_AD_PROVIDER;
    if ((provider === 'adsterra' || provider === 'both') && popunderSrc) {
      try {
        const existing = document.getElementById('adsterra-popunder-click');
        if (!existing) {
          const s = document.createElement('script');
          s.id    = 'adsterra-popunder-click';
          s.src   = popunderSrc;
          s.async = true;
          s.setAttribute('data-cfasync', 'false');
          document.body.appendChild(s);
        }
      } catch {}
    }

    setAdModalOpen(true);
  }, [adPlaying, adCooldownSecs]);

  // Called by AdModal after the ad is successfully watched
  const handleAdComplete = useCallback(async () => {
    setAdPlaying(true);
    try {
      const res = await watchAd() as any;
      energyRef.current     = res.energy;
      adsWatchedRef.current = res.ads_watched;
      const coolSecs = res.cooldown_seconds ?? 0;
      setAdCooldownSecs(coolSecs);
      setLocalEnergy(res.energy);
      setLocalAdsWatched(res.ads_watched);
      // Persist cooldown end-time so it survives page refreshes
      const cooldownUntil = coolSecs > 0 ? Date.now() + coolSecs * 1000 : 0;
      saveEnergyCache(res.energy, res.ads_watched, cooldownUntil);
    } catch {}
    setAdPlaying(false);
    setAdModalOpen(false);
  }, [watchAd]);

  // Tick down cooldown — when it hits 0, auto-reset adsWatched so
  // the Watch Ad button appears immediately without any extra user action
  useEffect(() => {
    if (adCooldownSecs <= 0) return;
    const t = setInterval(() => {
      setAdCooldownSecs(s => {
        const next = Math.max(0, s - 1);
        if (next === 0) {
          // Cooldown over — reset the batch count so Watch Ad button appears
          setLocalAdsWatched(0);
          adsWatchedRef.current = 0;
          saveEnergyCache(energyRef.current, 0, 0);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [adCooldownSecs]);



  // ── Derived ───────────────────────────────────────────────────────────────
  const energyPct   = Math.max(0, Math.min(100, localEnergy));
  const energyEmpty = energyPct <= 0;
  const adsLeft     = MAX_ADS - localAdsWatched;

  const barColor = energyPct > 40
    ? 'linear-gradient(90deg,rgba(255,255,255,0.45),white)'
    : energyPct > 15
      ? 'linear-gradient(90deg,rgba(255,180,0,0.7),rgba(255,220,0,1))'
      : 'linear-gradient(90deg,rgba(255,70,70,0.8),rgba(255,110,110,1))';


  // Skin shade map for background tint
  const SKIN_SHADES: Record<string, string> = {
    'Obsidian': '#1a1a1a',
    'Chrome':   '#c0c0c0',
    'Gold':     '#ffd700',
    'Sapphire': '#0f52ba',
    'Plasma':   '#8a2be2',
    'Neon':     '#39ff14',
  };
  const activeSkinShade = SKIN_SHADES[activeSkin ?? 'Obsidian'] ?? '#1a1a1a';

  // Skin PNG images — maps skin name to public path
  const SKIN_IMAGES: Record<string, string> = {
    'Obsidian': '/skins/Fidger.png',
    'Chrome':   '/skins/Based.png',
    'Gold':     '/skins/EarlyFidger.png',
    'Sapphire': '/skins/Christmas.png',
    'Plasma':   '/skins/Galaxy.png',
    'Neon':     '/skins/Pizza.png',
  };
  const skinImageUrl = SKIN_IMAGES[activeSkin ?? 'Obsidian'] ?? '/skins/Fidger.png';

  const SKIN_MULTIPLIERS: Record<string, number> = {
    'Obsidian': 1.0, 'Chrome': 1.0, 'Gold': 1.3,
    'Sapphire': 1.4, 'Neon': 1.6, 'Plasma': 1.7,
  };
  const skinMultiplier = SKIN_MULTIPLIERS[activeSkin ?? 'Obsidian'] ?? 1.0;

  // Higher skins drain energy slower (longer spin time)
  const SKIN_DRAIN_MODIFIER: Record<string, number> = {
    'Obsidian': 1.00, 'Chrome': 1.00,
    'Gold':     0.85, 'Sapphire': 0.80,
    'Neon':     0.70, 'Plasma':   0.65,
  };
  const drainModifier = SKIN_DRAIN_MODIFIER[activeSkin ?? 'Obsidian'] ?? 1.0;

  return (
    <main style={{ minHeight:'100vh', background:'#000', position:'relative', overflow:'hidden', WebkitTapHighlightColor:'transparent' as any }}>
      <style>{`
        @keyframes _s  { to{transform:rotate(360deg)} }
        @keyframes _p  { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes _up { from{transform:translateY(5px);opacity:0}to{transform:translateY(0);opacity:1} }
      `}</style>

      {!loaded && (
        <div style={{ position:'fixed',inset:0,background:'#000',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ animation:'_s 1s linear infinite' }}>
            <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none"/>
            <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" fill="none" strokeDasharray="40 85" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      <div className="dot-bg" style={{ position:'absolute',inset:0,opacity:.35,maskImage:'radial-gradient(ellipse 80% 80% at 50% 40%,black 30%,transparent 100%)',WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 50% 40%,black 30%,transparent 100%)',pointerEvents:'none' }}/>

      {/* Skin-tinted full-screen background */}
      {loggedIn && activeSkin !== 'Obsidian' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: `radial-gradient(ellipse 160% 120% at 50% -10%, ${activeSkinShade}60 0%, ${activeSkinShade}20 40%, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 0.8s ease',
        }} />
      )}
      <TopHeader title="Spinner" showConnect onMenuSelect={k => setModal(k as ModalType)} />

      <div style={{ position:'relative', zIndex:1, paddingBottom:110 }}>

        {/* Not loggedIn */}
        {!loggedIn && (
          <div style={{ margin:'14px 16px 0',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:12 }}>
            <span style={{ fontSize:18,opacity:.5 }}>⚠</span>
            <div>
              <p style={{ fontFamily:'Rajdhani',fontWeight:700,fontSize:15,color:'white' }}>No Points Earned</p>
              <p style={{ fontFamily:'Rajdhani',fontSize:13,color:'rgba(255,255,255,0.4)' }}>Sign in to start earning from spinning.</p>
            </div>
          </div>
        )}

        {/* Energy empty banner */}
        {loggedIn && energyEmpty && (
          <div style={{ margin:'14px 16px 0',background:'rgba(255,60,60,0.06)',border:'1px solid rgba(255,80,80,0.2)',borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:12 }}>
            <span style={{ fontSize:22 }}>⚡</span>
            <div>
              <p style={{ fontFamily:'Rajdhani',fontWeight:700,fontSize:15,color:'rgba(255,120,100,.95)' }}>Energy depleted!</p>
              <p style={{ fontFamily:'Rajdhani',fontSize:13,color:'rgba(255,255,255,0.4)' }}>Watch an ad below to restore +20% · Full reset in {fmtCountdown(secsToReset)}</p>
            </div>
          </div>
        )}

        {/* Spinner */}
        <div style={{ position:'relative' }}>
          <div style={{ position:'absolute',top:16,right:18,zIndex:10 }}>
            <div style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:999,padding:'6px 14px' }}>
              <div style={{ width:7,height:7,borderRadius:'50%',background:isSpinning?'white':'rgba(255,255,255,0.3)',boxShadow:isSpinning?'0 0 8px white':'none',animation:isSpinning?'_p 1.2s ease infinite':'none',transition:'all .3s' }}/>
              <span style={{ fontFamily:'Space Mono,monospace',fontSize:11,color:isSpinning?'white':'rgba(255,255,255,0.4)',letterSpacing:'1px',fontWeight:700 }}>
                {isSpinning ? 'SPINNING' : 'IDLE'}
              </span>
            </div>
          </div>

          <div
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}     onPointerLeave={onPointerUp}
            style={{ display:'flex',justifyContent:'center',padding:'32px 0',cursor:loggedIn&&!energyEmpty?'grab':'default',touchAction:'none',userSelect:'none' }}
          >
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:280,height:280,background:'radial-gradient(circle,rgba(255,255,255,0.06) 0%,transparent 65%)',borderRadius:'50%',pointerEvents:'none',opacity:isSpinning?1:.4,transition:'opacity .5s' }}/>
              <div ref={spinnerRef} style={{
                width: 240, height: 240,
                opacity: loggedIn ? 1 : 0.3,
                transition: 'opacity .5s',
                filter: isSpinning
                  ? 'drop-shadow(0 0 28px rgba(255,255,255,0.35)) drop-shadow(0 0 8px rgba(255,255,255,0.2))'
                  : 'drop-shadow(0 0 6px rgba(255,255,255,0.08))',
              }}>
                <img
                  src={skinImageUrl}
                  alt={activeSkin ?? 'spinner'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hint text */}
        <p style={{ textAlign:'center',fontFamily:'Space Mono,monospace',fontSize:11,color:'rgba(255,255,255,0.3)',letterSpacing:'2px',marginBottom:12 }}>
          {!loggedIn ? 'SIGN IN TO SPIN' : energyEmpty ? 'NO ENERGY LEFT' : isSpinning ? 'SPINNING…' : 'SWIPE TO SPIN'}
        </p>



        {/* Stats cards */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,padding:'0 16px',marginBottom:16 }}>
          <div className="card" style={{ padding:'18px 16px',overflow:'hidden' }}>
            <p style={{ fontFamily:'Space Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.35)',letterSpacing:'2px',marginBottom:10 }}>POINTS</p>
            <p style={{ fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:24,color:'white',lineHeight:1,animation:isSpinning?'_up .15s ease':'none' }}>
              {loggedIn ? localPoints.toFixed(1) : '—'}
            </p>
            {isSpinning && loggedIn && (
              <p style={{ fontFamily:'Rajdhani,sans-serif',fontSize:11,color:'rgba(0,220,140,0.85)',marginTop:6,letterSpacing:'1px' }}>⬆ EARNING</p>
            )}
          </div>

          <div className="card" style={{ padding:'18px 16px' }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
              <p style={{ fontFamily:'Space Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.35)',letterSpacing:'2px' }}>ENERGY</p>
              <p style={{ fontFamily:'Space Mono,monospace',fontSize:10,color:energyEmpty?'rgba(255,100,100,0.7)':'rgba(255,255,255,0.5)' }}>
                {loggedIn ? Math.round(energyPct) : '--'}/100
              </p>
            </div>
            <div style={{ height:5,background:'rgba(255,255,255,0.08)',borderRadius:3,overflow:'hidden',marginBottom:10 }}>
              <div style={{ height:'100%',width:`${energyPct}%`,background:barColor,borderRadius:3,transition:'width .25s ease' }}/>
            </div>
            <p style={{ fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:24,color:energyEmpty?'rgba(255,100,100,0.7)':'white',lineHeight:1 }}>
              {loggedIn ? Math.round(energyPct) : '--'}<span style={{ fontSize:13,color:'rgba(255,255,255,0.4)' }}>%</span>
            </p>
            {energyEmpty && loggedIn && (
              <p style={{ fontFamily:'Rajdhani,sans-serif',fontSize:11,color:'rgba(255,100,100,0.6)',marginTop:5 }}>resets in {fmtCountdown(secsToReset)}</p>
            )}
          </div>
        </div>

        {/* ── Watch Ad section — always visible when loggedIn, prominent when energy=0 ── */}
        {loggedIn && (
          <div style={{ padding:'0 16px', marginBottom: 16 }}>
            <div style={{
              background: energyEmpty ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${energyEmpty ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 18,
              padding: '18px 16px',
            }}>
              {/* Header */}
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                <p style={{ fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,color:'white' }}>
                  {energyEmpty ? 'ENERGY EMPTY?' : 'Watch ads · +20% energy each'}
                </p>
                <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                  <span style={{ fontFamily:'Orbitron,sans-serif',fontWeight:700,fontSize:13,color: localAdsWatched >= MAX_ADS ? 'rgba(255,100,100,0.8)' : 'rgba(255,255,255,0.6)' }}>
                    {localAdsWatched}/5
                  </span>
                  <span style={{ fontSize:12 }}>📺</span>
                </div>
              </div>

              <p style={{ fontFamily:'Space Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.3)',letterSpacing:'1px',marginBottom:14 }}>
                {localAdsWatched < MAX_ADS
                  ? (adCooldownSecs > 0 ? `Next batch in ${fmtCooldown(adCooldownSecs)}` : `${MAX_ADS - localAdsWatched} of 5 remaining this batch`)
                  : adCooldownSecs > 0
                    ? `Batch cooldown · next in ${fmtCooldown(adCooldownSecs)}`
                    : 'Ready for next batch!'}
              </p>

              {/* Progress bar — 5 segments */}
              <div style={{ display:'flex',gap:5,marginBottom:16 }}>
                {Array.from({ length: MAX_ADS }).map((_, i) => (
                  <div key={i} style={{
                    flex:1, height:4, borderRadius:2,
                    background: i < localAdsWatched ? 'white' : 'rgba(255,255,255,0.1)',
                    boxShadow: i < localAdsWatched ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
                    transition:'all .3s',
                  }}/>
                ))}
              </div>

              {/* Watch Ad button */}
              {localAdsWatched >= MAX_ADS && adCooldownSecs > 0 ? (
                /* Batch complete — 2hr cooldown active */
                <div style={{ background:'rgba(255,200,0,0.04)',border:'1px solid rgba(255,200,0,0.15)',borderRadius:12,padding:'14px',textAlign:'center' }}>
                  <p style={{ fontFamily:'Space Mono,monospace',fontSize:10,color:'rgba(255,200,0,0.5)',marginBottom:4,letterSpacing:1 }}>NEXT BATCH IN</p>
                  <p style={{ fontFamily:'Orbitron,sans-serif',fontWeight:700,fontSize:22,color:'rgba(255,200,0,0.8)' }}>{fmtCooldown(adCooldownSecs)}</p>
                  <p style={{ fontFamily:'Rajdhani,sans-serif',fontSize:12,color:'rgba(255,255,255,0.25)',marginTop:6 }}>2-hour cooldown between batches</p>
                </div>
              ) : (
                <button
                  onClick={handleWatchAd}
                  disabled={adPlaying || adCooldownSecs > 0}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:14,
                    padding:'14px 16px', borderRadius:13,
                    background: adPlaying ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${adPlaying ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)'}`,
                    cursor: adPlaying ? 'wait' : 'pointer',
                    transition:'all .2s',
                  }}
                >
                  <div style={{ width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,animation:adPlaying?'_p 1s ease infinite':'none' }}>
                    <span style={{ fontSize:14 }}>{adPlaying ? '⟳' : '▶'}</span>
                  </div>
                  <div style={{ flex:1,textAlign:'left' }}>
                    <p style={{ fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,color: adPlaying ? 'rgba(255,255,255,0.4)' : 'white',margin:0 }}>
                      {adPlaying ? `Ad playing… ${adCountdown}s` : 'Watch Ad · +20% Energy'}
                    </p>
                    <p style={{ fontFamily:'Space Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.3)',margin:'3px 0 0',letterSpacing:'1px' }}>
                      {adsLeft} of 5 this batch · 2hr cooldown after
                    </p>
                  </div>
                  <span style={{ fontFamily:'Orbitron,sans-serif',fontWeight:700,fontSize:14,color:'rgba(255,255,255,0.5)' }}>{adsLeft}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <LegalModal type={modal} onClose={() => setModal(null)} />

      <AdModal
        open={adModalOpen}
        onClose={() => { setAdModalOpen(false); setAdPlaying(false); }}
        onAdComplete={handleAdComplete}
      />
    </main>
  );
}
