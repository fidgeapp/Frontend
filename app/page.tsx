'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useRef, useState } from 'react';
import TopHeader from '@/components/TopHeader';
import LegalModal, { ModalType } from '@/components/LegalModal';

function FidgetSpinner() {
  const spinnerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let angle = 0, id: number;
    const animate = () => {
      angle += 1.2;
      if (spinnerRef.current) spinnerRef.current.style.transform = `rotate(${angle}deg)`;
      id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 36px', position: 'relative' }}>
      {/* Glow ring behind spinner */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }}/>
      <div ref={spinnerRef} style={{ width: '260px', height: '260px' }}>
        <img
          src="/fidge3d.png"
          alt="Fidge Spinner"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.15))',
          }}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────
export default function HomePage() {
  const [loaded, setLoaded]       = useState(false);
  const [modal, setModal]         = useState<ModalType>(null);
  const [faqOpen, setFaqOpen]     = useState(false);

  useEffect(() => { const t = setTimeout(() => setLoaded(true), 50); return () => clearTimeout(t); }, []);

  return (
    <main suppressHydrationWarning style={{ minHeight: '100vh', background: '#000', position: 'relative', overflow: 'hidden', WebkitTapHighlightColor: 'transparent' as any }}>

      {/* Page loader */}
      {!loaded && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ animation: '_spin 1s linear infinite' }}>
            <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none"/>
            <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" fill="none" strokeDasharray="40 85" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      {/* Dot grid */}
      <div className="dot-bg" style={{ position: 'absolute', inset: 0, opacity: 0.4, maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 100%)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '400px', background: 'radial-gradient(ellipse, rgba(255,255,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      {/* TopHeader handles navigation + ⋮ menu */}
      <TopHeader title="Fidge" onMenuSelect={(key) => setModal(key as ModalType)} />

      {/* Page content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <section style={{ textAlign: 'center', padding: '52px 24px 0' }}>
          <div style={{ display: 'inline-block', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '5px 16px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>FIDGET · EARN · SPIN</span>
          </div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '44px', lineHeight: 1.05, color: 'white', letterSpacing: '3px', textShadow: '0 0 40px rgba(255,255,255,0.2)' }}>
            CAN&apos;T<br/>STAY STILL
          </h1>
        </section>

        <FidgetSpinner />

        <section style={{ padding: '0 18px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px' }}>START HERE</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)' }}/>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* What is Fidge — accordion */}
            <div className="card shimmer" style={{ overflow: 'hidden' }}>
              <button
                onClick={() => setFaqOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'white' }}>◈</div>
                  <p style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '17px', color: 'white' }}>What is Fidge?</p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px', transition: 'transform 0.3s', transform: faqOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>⌄</span>
              </button>
              {faqOpen && (
                <div style={{ padding: '0 20px 20px' }}>
                  <p style={{ fontFamily: 'Rajdhani', fontSize: '15px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: '12px' }}>
                    Fidge is a next-gen Web3 fidget spinner mini-app engineered for dopamine-driven fun, stress relief, and competitive community engagement. Users mint or acquire a Fidge NFT, which serves as an on-chain asset powering in-app spins, point generation, stat tracking, and real-time leaderboard competition.
                  </p>
                  <p style={{ fontFamily: 'Rajdhani', fontSize: '15px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
                    By fusing ultra-simple, loop-based gameplay with verifiable on-chain ownership, transparent reward mechanics, and scalable mini-app infrastructure, Fidge redefines how users interact, compete, and earn in lightweight Web3 experiences.
                  </p>
                </div>
              )}
            </div>

            {/* Check Out Portfolio */}
            <div className="card shimmer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'white' }}>◆</div>
                <div>
                  <p style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '17px', color: 'white' }}>Check Out Portfolio</p>
                  <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>See what we&apos;ve built</p>
                </div>
              </div>
              <div style={{ width: '28px', height: '28px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>›</div>
            </div>

            {/* Start Spinning */}
            <a href="/spinner" style={{ textDecoration: 'none' }}>
              <div className="card shimmer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'white' }}>◎</div>
                  <div>
                    <p style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '17px', color: 'white' }}>Don&apos;t panic — just Fidge</p>
                    <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>Start spinning now</p>
                  </div>
                </div>
                <div style={{ width: '28px', height: '28px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>›</div>
              </div>
            </a>

          </div>
        </section>
      </div>

      {/* ── MODAL ── */}
      <LegalModal modal={modal} setModal={setModal} />
    </main>
  );
}
