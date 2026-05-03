'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/AuthModal';
import LegalModal, { ModalType } from '@/components/LegalModal';


function AuthButton() {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        onClick={() => setShow(true)}
        style={{
          background: '#fff', color: '#000', border: 'none',
          borderRadius: 12, padding: '14px 32px',
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          width: '100%', maxWidth: 360,
        }}
      >
        Get Started
      </button>
      {show && <AuthModal onClose={() => setShow(false)} defaultMode="register" />}
    </>
  );
}

export default function HomePage() {
  const { loggedIn, hydrated } = useAuth();
  const router = useRouter();
  const [modal, setModal] = useState<ModalType>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loggedIn && hydrated) {
      router.replace('/spinner');
    }
  }, [loggedIn, hydrated, router]);

  return (
    <main style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '24px 20px' }}>
      <style>{`
        @keyframes _rot { to { transform: rotate(360deg); } }
        @keyframes _fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes _glow  { 0%,100% { opacity:.5 } 50% { opacity:1 } }
      `}</style>

      {/* Dot background */}
      <div className="dot-bg" style={{ position: 'absolute', inset: 0, opacity: .25, maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%,black 20%,transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%,black 20%,transparent 100%)', pointerEvents: 'none' }} />

      {/* Glow orb */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, background: 'radial-gradient(circle,rgba(255,255,255,0.05) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none', animation: '_glow 4s ease infinite' }} />

      {/* Spinner hero */}
      <div style={{ opacity: loaded ? 1 : 0, transition: 'opacity .6s ease', marginBottom: 40, animation: loaded ? '_rot 12s linear infinite' : 'none' }}>
        <svg width="160" height="160" viewBox="0 0 240 240" fill="none">
          <defs>
            <radialGradient id="hg" cx="30%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#cccccc" />
              <stop offset="100%" stopColor="#555555" />
            </radialGradient>
            <radialGradient id="hd" cx="30%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#060606" />
            </radialGradient>
            <linearGradient id="hs" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
            <filter id="hglow">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <ellipse cx="120" cy="55"  rx="42" ry="42" fill="url(#hd)" stroke="url(#hs)" strokeWidth="1.5" />
          <circle  cx="120" cy="55"  r="24"  fill="url(#hg)" filter="url(#hglow)" />
          <ellipse cx="62"  cy="165" rx="42" ry="42" fill="url(#hd)" stroke="url(#hs)" strokeWidth="1.5" />
          <circle  cx="62"  cy="165" r="24"  fill="url(#hg)" filter="url(#hglow)" />
          <ellipse cx="178" cy="165" rx="42" ry="42" fill="url(#hd)" stroke="url(#hs)" strokeWidth="1.5" />
          <circle  cx="178" cy="165" r="24"  fill="url(#hg)" filter="url(#hglow)" />
          <path d="M90 88 L120 55 L150 88 L165 130 L120 150 L75 130 Z"  fill="url(#hd)" stroke="url(#hs)" strokeWidth="1.5" />
          <path d="M75 130 L62 165 L95 175 L120 150 Z"                  fill="url(#hd)" stroke="url(#hs)" strokeWidth="1" />
          <path d="M165 130 L178 165 L145 175 L120 150 Z"               fill="url(#hd)" stroke="url(#hs)" strokeWidth="1" />
          <circle cx="120" cy="120" r="30" fill="url(#hd)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <circle cx="120" cy="120" r="20" fill="#050505" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <text x="112" y="127" fontFamily="Orbitron,sans-serif" fontWeight="900" fontSize="15" fill="white">F</text>
        </svg>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', marginBottom: 40, opacity: loaded ? 1 : 0, animation: loaded ? '_fadeUp .6s ease .2s both' : 'none' }}>
        <h1 style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 'clamp(28px,8vw,40px)', color: 'white', letterSpacing: '2px', marginBottom: 10, lineHeight: 1.1 }}>
          FIDGE
        </h1>
        <p style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,0.5)', letterSpacing: '3px' }}>
          FIDGET · EARN · SPIN
        </p>
      </div>

      {/* Stats pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 44, opacity: loaded ? 1 : 0, animation: loaded ? '_fadeUp .6s ease .35s both' : 'none', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'DAILY ENERGY', value: '100%' },
          { label: 'SKINS',        value: '10+' },
          { label: 'EARN',         value: 'PCEDO' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 18px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 15, color: 'white', margin: 0 }}>{stat.value}</p>
            <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', margin: '3px 0 0' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Connect */}
      <div style={{ width: '100%', maxWidth: 360, opacity: loaded ? 1 : 0, animation: loaded ? '_fadeUp .6s ease .5s both' : 'none' }}>
        <AuthButton />
      </div>

      {/* Legal links */}
      <div style={{ display: 'flex', gap: 20, marginTop: 28, opacity: loaded ? 1 : 0, animation: loaded ? '_fadeUp .6s ease .6s both' : 'none' }}>
        {(['terms', 'privacy', 'disclaimer'] as ModalType[]).map(k => (
          <button key={k} onClick={() => setModal(k)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontFamily: 'Space Mono,monospace', fontSize: 9, letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase' }}>
            {k}
          </button>
        ))}
      </div>

      <LegalModal type={modal} onClose={() => setModal(null)} />
    </main>
  );
}
