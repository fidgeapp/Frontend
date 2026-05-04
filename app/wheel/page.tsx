'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useCallback } from 'react';
import TopHeader from '@/components/TopHeader';
import { useAuth } from '@/context/AuthContext';
import LegalModal, { ModalType } from '@/components/LegalModal';
import { Wheel as WheelApi } from '@/lib/api';

const SPIN_COST = 2;

const DEFAULT_SEGMENTS = [
  { label: '50 PTS',    prize: '50 Points',   type: 'points', value: 50,  color: '#96CEB4', weight: 30 },
  { label: '1 💎',      prize: '1 Gem',        type: 'gems',   value: 1,   color: '#4ECDC4', weight: 20 },
  { label: '250 PTS',   prize: '250 Points',  type: 'points', value: 250, color: '#FF6B6B', weight: 22 },
  { label: '1 PCEDO',   prize: '1 $PCEDO',   type: 'pcedo',  value: 1,   color: '#BB8FCE', weight: 12 },
  { label: '500 PTS',   prize: '500 Points',  type: 'points', value: 500, color: '#FFE66D', weight: 18 },
  { label: '2 💎',      prize: '2 Gems',       type: 'gems',   value: 2,   color: '#45B7D1', weight: 10 },
  { label: '5 PCEDO',   prize: '5 $PCEDO',   type: 'pcedo',  value: 5,   color: '#9B59B6', weight: 5  },
  { label: '10 💎',     prize: '10 Gems',      type: 'gems',   value: 10,  color: '#F7DC6F', weight: 3  },
  { label: '10 PCEDO',  prize: '10 $PCEDO',  type: 'pcedo',  value: 10,  color: '#8E44AD', weight: 3  },
  { label: '100 PCEDO', prize: '100 $PCEDO', type: 'pcedo',  value: 100, color: '#A855F7', weight: 1  },
];

const NUM_SEGMENTS   = DEFAULT_SEGMENTS.length;
const SEGMENT_ANGLE  = 360 / NUM_SEGMENTS;

type Segment = typeof DEFAULT_SEGMENTS[0];

export default function WheelPage() {
  const { loggedIn, gems, pcedoEarned, applyUserPatch } = useAuth();
  const [segments,    setSegments]    = useState<Segment[]>(DEFAULT_SEGMENTS);
  const [spinning,    setSpinning]    = useState(false);
  const [rotation,    setRotation]    = useState(0);
  const [result,      setResult]      = useState<Segment | null>(null);
  const [showResult,  setShowResult]  = useState(false);
  const [spinError,   setSpinError]   = useState('');
  const [loaded,      setLoaded]      = useState(false);
  const [modal,       setModal]       = useState<ModalType>(null);

  // Auto-spin state
  const [autoTotal,      setAutoTotal]      = useState(0);
  const [autoRemaining,  setAutoRemaining]  = useState(0);
  const [autoRunning,    setAutoRunning]    = useState(false);
  const [showAutoMenu,   setShowAutoMenu]   = useState(false);

  const rotationRef  = useRef(0);
  const spinningRef  = useRef(false); // ref version to avoid stale closure
  const autoRunRef   = useRef(false); // ref version for auto-spin

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Load real segments from backend (keeps wheel in sync with server)
  useEffect(() => {
    WheelApi.segments().then(d => {
      if (d.segments?.length) setSegments(d.segments);
    }).catch(() => {});
  }, []);

  // ── Core spin function ────────────────────────────────────────────────────

  const spin = useCallback(async (): Promise<boolean> => {
    // Guard: don't spin if already spinning or not enough gems
    if (spinningRef.current) return false;
    if (!loggedIn) return false;

    // Re-read gems from DOM/state snapshot isn't reliable inside callback —
    // the backend will reject if not enough gems anyway, so we just try.

    spinningRef.current = true;
    setSpinning(true);
    setShowResult(false);
    setResult(null);
    setSpinError('');

    try {
      const res = await WheelApi.spin();
      const winIndex = res.result.segment_index as number;
      const won = segments[winIndex] ?? DEFAULT_SEGMENTS[winIndex];

      // Animate wheel to winning segment
      const extraSpins   = (8 + Math.floor(Math.random() * 4)) * 360;
      const targetAngle  = 360 - (winIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
      const totalRot     = rotationRef.current + extraSpins + (targetAngle - (rotationRef.current % 360) + 360) % 360;
      rotationRef.current = totalRot;
      setRotation(totalRot);

      // Update balances from server response
      applyUserPatch({
        gems:         res.user.gems,
        points:       res.user.points,
        spin_points:  res.user.spin_points,
        pcedo_earned: res.user.pcedo_earned ?? pcedoEarned,
      });

      // Wait for animation to finish then show result
      await new Promise<void>(resolve => setTimeout(resolve, 7000));

      spinningRef.current = false;
      setSpinning(false);
      setResult(won);
      setShowResult(true);
      return true;
    } catch (e: unknown) {
      spinningRef.current = false;
      setSpinning(false);
      const msg = e instanceof Error ? e.message : 'Spin failed';
      setSpinError(msg);
      return false;
    }
  }, [loggedIn, segments, pcedoEarned, applyUserPatch]);

  // ── Auto-spin runner ──────────────────────────────────────────────────────

  const runAutoSpin = useCallback(async (total: number) => {
    autoRunRef.current = true;
    let remaining = total;
    setAutoTotal(total);
    setAutoRemaining(total);
    setAutoRunning(true);

    while (remaining > 0 && autoRunRef.current) {
      // Check gems before each spin (gems from state may be stale, 
      // but backend will reject anyway — check to avoid unnecessary calls)
      const ok = await spin();
      if (!ok) {
        // Either stopped or not enough gems
        break;
      }
      remaining--;
      setAutoRemaining(remaining);

      // Pause between auto-spins (let user see the result modal briefly)
      if (remaining > 0 && autoRunRef.current) {
        // Auto-close result and wait 1.5s before next spin
        setShowResult(false);
        setResult(null);
        await new Promise<void>(resolve => setTimeout(resolve, 1500));
      }
    }

    autoRunRef.current = false;
    setAutoRunning(false);
    setAutoRemaining(0);
  }, [spin]);

  const startAutoSpin = (count: number) => {
    if (spinning || spinningRef.current) return;
    setShowAutoMenu(false);
    runAutoSpin(count);
  };

  const stopAutoSpin = () => {
    autoRunRef.current = false;
    setAutoRunning(false);
    setAutoRemaining(0);
  };

  // ── Wheel drawing ─────────────────────────────────────────────────────────

  const size   = 300;
  const cx     = size / 2;
  const cy     = size / 2;
  const radius = size / 2 - 4;

  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });

  const wheelPaths = segments.map((seg, i) => {
    const a0  = i * SEGMENT_ANGLE - 90;
    const a1  = a0 + SEGMENT_ANGLE;
    const s   = toXY(a0, radius);
    const e   = toXY(a1, radius);
    const mid = toXY(a0 + SEGMENT_ANGLE / 2, radius * 0.65);
    const path = `M ${cx} ${cy} L ${s.x} ${s.y} A ${radius} ${radius} 0 0 1 ${e.x} ${e.y} Z`;
    return { path, mid, lines: seg.label.split(' '), color: seg.color };
  });

  const canSpin = loggedIn && gems >= SPIN_COST && !spinning && !autoRunning;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: '100vh', background: '#000', position: 'relative', overflow: 'hidden', WebkitTapHighlightColor: 'transparent' as any }}>

      {!loaded && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ animation: '_spin 1s linear infinite' }}>
            <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none"/>
            <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" fill="none" strokeDasharray="40 85" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      <div className="dot-bg" style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none' }}/>
      <TopHeader title="Spin Wheel" onMenuSelect={k => setModal(k as ModalType)} />

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>

        {/* Gem balance + cost */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px 18px' }}>
          <div>
            <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '4px' }}>YOUR GEMS</p>
            <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '22px', color: 'white' }}>{gems} 💎</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '4px' }}>COST PER SPIN</p>
            <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '22px', color: 'rgba(255,200,80,0.9)' }}>{SPIN_COST} 💎</p>
          </div>
        </div>

        {/* Wheel */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: '-14px', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>
            <svg width="24" height="28" viewBox="0 0 24 28"><polygon points="12,28 0,0 24,0" fill="white"/></svg>
          </div>
          <div style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 7s cubic-bezier(0.17, 0.67, 0.12, 1.0)' : 'none',
            borderRadius: '50%',
            boxShadow: '0 0 40px rgba(255,255,255,0.1), 0 0 80px rgba(255,100,0,0.15)',
          }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {wheelPaths.map(({ path, mid, lines, color }, i) => (
                <g key={i}>
                  <path d={path} fill={color} stroke="#000" strokeWidth="2"/>
                  {lines.map((line, li) => (
                    <text key={li}
                      x={mid.x} y={mid.y + (li - (lines.length - 1) / 2) * 13}
                      textAnchor="middle" dominantBaseline="middle"
                      fontFamily="Orbitron,sans-serif" fontWeight="700" fontSize="10" fill="white"
                      style={{ pointerEvents: 'none' }}>
                      {line}
                    </text>
                  ))}
                </g>
              ))}
              <circle cx={cx} cy={cy} r="22" fill="#0d0d0d" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontFamily="Orbitron,sans-serif" fontWeight="900" fontSize="14" fill="white">F</text>
            </svg>
          </div>
        </div>

        {/* Error / warnings */}
        {spinError && (
          <div style={{ width: '100%', background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '12px', padding: '12px 16px' }}>
            <p style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '14px', color: 'rgb(255,120,120)' }}>⚠️ {spinError}</p>
          </div>
        )}
        {loggedIn && gems < SPIN_COST && !autoRunning && (
          <div style={{ width: '100%', background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '12px', padding: '12px 16px' }}>
            <p style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '14px', color: 'rgb(255,120,120)' }}>⚠️ Not enough gems — you need {SPIN_COST} 💎 to spin</p>
          </div>
        )}
        {!loggedIn && (
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px' }}>
            <p style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>⚠ Sign in to play</p>
          </div>
        )}

        {/* Auto-spin status bar */}
        {autoRunning && (
          <div style={{ width: '100%', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: 'rgba(96,165,250,0.8)', letterSpacing: 1 }}>AUTO-SPINNING</p>
              <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 18, color: 'white', marginTop: 2 }}>
                {autoRemaining} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>of {autoTotal} remaining</span>
              </p>
            </div>
            <button onClick={stopAutoSpin} style={{ padding: '8px 16px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.35)', borderRadius: 10, color: 'rgba(255,120,100,0.9)', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}>
              ⬛ STOP
            </button>
          </div>
        )}

        {/* Manual spin button */}
        <button onClick={() => spin()} disabled={!canSpin} style={{
          width: '100%', padding: '18px',
          background: canSpin ? 'linear-gradient(135deg, #FF6B35, #FFE66D, #4ECDC4, #A855F7)' : 'rgba(255,255,255,0.05)',
          border: canSpin ? 'none' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px', cursor: canSpin ? 'pointer' : 'not-allowed',
          fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: '16px',
          color: canSpin ? '#000' : 'rgba(255,255,255,0.2)', letterSpacing: '2px',
          boxShadow: canSpin ? '0 0 30px rgba(255,180,0,0.3)' : 'none',
          transition: 'all 0.3s', WebkitTapHighlightColor: 'transparent' as any,
        }}>
          {spinning ? 'SPINNING...' : autoRunning ? `AUTO · ${autoRemaining} LEFT` : `SPIN · ${SPIN_COST} 💎`}
        </button>

        {/* Auto-spin selector */}
        {loggedIn && !autoRunning && (
          <div style={{ width: '100%', position: 'relative' }}>
            <button onClick={() => setShowAutoMenu(p => !p)} style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.55)', fontFamily: 'Rajdhani,sans-serif',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🔄</span> Enable Auto-Spin
              </span>
              <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                {showAutoMenu ? '▲' : '▼'}
              </span>
            </button>

            {showAutoMenu && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
                background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
              }}>
                {/* Coming Soon banner for auto-spin */}
                <div style={{ margin: '10px 12px 4px', padding: '10px 12px', background: 'rgba(255,200,0,0.06)', border: '1px solid rgba(255,200,0,0.2)', borderRadius: 10, textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 11, color: 'rgba(255,200,0,0.8)', letterSpacing: 1, marginBottom: 3 }}>🚀 COMING SOON</p>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Auto-spin is not yet available</p>
                </div>
                <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, padding: '6px 14px 6px' }}>
                  SELECT HOW MANY TIMES TO AUTO-SPIN
                </p>
                {[3, 5, 10, 20, 50].map(n => {
                  const totalCost  = n * SPIN_COST;
                  const affordable = gems >= totalCost;
                  return (
                    <button key={n}
                      onClick={() => window.open('/coming_soon', '_blank')}
                      disabled={false}
                      style={{
                        width: '100%', padding: '13px 16px',
                        background: 'rgba(255,255,255,0.02)',
                        border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                      <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 18, color: affordable ? 'white' : 'rgba(255,255,255,0.25)' }}>
                        {n}×
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 13, color: affordable ? 'rgba(255,200,80,0.9)' : 'rgba(255,255,255,0.2)' }}>
                          {totalCost} 💎
                        </p>
                        {!affordable && (
                          <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 8, color: 'rgba(255,80,80,0.6)' }}>not enough gems</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Possible prizes */}
        <div style={{ width: '100%' }}>
          <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '12px', textAlign: 'center' }}>POSSIBLE PRIZES</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {segments.map((seg, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${seg.color}33`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: seg.color, flexShrink: 0, boxShadow: `0 0 6px ${seg.color}` }}/>
                <div>
                  <p style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{seg.prize}</p>
                  <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '8px', color: seg.weight <= 3 ? seg.color : 'rgba(255,255,255,0.25)', letterSpacing: '1px' }}>
                    {seg.weight <= 3 ? '★ RARE' : seg.weight <= 12 ? 'UNCOMMON' : 'COMMON'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Win result modal */}
      {showResult && result && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '340px', background: '#0d0d0d', borderRadius: '24px', border: `1px solid ${result.color}55`, padding: '36px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: `0 0 60px ${result.color}33` }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `radial-gradient(circle, ${result.color}44, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', border: `2px solid ${result.color}66` }}>
              {result.type === 'points' ? '⭐' : result.type === 'gems' ? '💎' : '🪙'}
            </div>
            <p style={{ fontFamily: 'Space Mono,monospace', fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '3px' }}>YOU WON</p>
            <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: '28px', color: result.color, letterSpacing: '2px', textAlign: 'center', textShadow: `0 0 20px ${result.color}` }}>
              {result.prize}
            </p>
            <p style={{ fontFamily: 'Rajdhani', fontSize: '14px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              {result.type === 'pcedo'
                ? '$PCEDO added to your balance. Withdraw anytime in Profile.'
                : result.type === 'gems'
                  ? 'Gems added to your account!'
                  : 'Points added to your balance!'}
            </p>

            {autoRunning ? (
              /* Auto-spin mode: show Next button with count */
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button onClick={stopAutoSpin}
                  style={{ flex: 1, padding: '14px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '12px', color: 'rgba(255,130,110,0.9)', letterSpacing: '1px' }}>
                  ⬛ STOP
                </button>
                <button
                  onClick={() => { setShowResult(false); setResult(null); }}
                  style={{ flex: 2, padding: '14px', background: result.color, border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '13px', color: '#000', letterSpacing: '1px' }}>
                  NEXT · {autoRemaining - 1 > 0 ? `${autoRemaining - 1} left` : 'LAST!'}
                </button>
              </div>
            ) : (
              /* Manual mode: Try Again + Awesome */
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button
                  onClick={() => { setShowResult(false); setResult(null); }}
                  style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.7)', letterSpacing: '1px' }}>
                  TRY AGAIN
                </button>
                <button
                  onClick={() => { setShowResult(false); setResult(null); }}
                  style={{ flex: 1, padding: '14px', background: result.color, border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: '13px', color: '#000', letterSpacing: '1px' }}>
                  AWESOME!
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <LegalModal modal={modal} setModal={setModal} />
    </main>
  );
}
