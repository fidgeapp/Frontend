'use client';

/**
 * /join?ref=ABCD1234
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/AuthModal';

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loggedIn, hydrated } = useAuth();
  const [refCode, setRefCode] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 1. Capture and persist the ref code silently
    const ref = searchParams.get('ref')?.toUpperCase() ?? '';
    if (ref) {
      setRefCode(ref);
      try {
        sessionStorage.setItem('fidge_ref', ref);
      } catch {}
    }
    // AUTO-TRIGGER REMOVED: No more setTimeout to open the modal
  }, [searchParams]);

  useEffect(() => {
    if (loggedIn && hydrated) router.replace('/spinner');
  }, [loggedIn, hydrated, router]);

  return (
    <main style={{
      minHeight: '100dvh', background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        background: '#0f0f0f', border: '1px solid #2a2a2a',
        borderRadius: 20, padding: '40px 32px',
        maxWidth: 380, width: '100%', textAlign: 'center',
      }}>
        <img src="/logo.png" alt="Fidge" style={{ height: 48, marginBottom: 20 }} />

        <h1 style={{
          fontFamily: 'Orbitron, sans-serif', fontWeight: 900,
          fontSize: 24, color: '#fff', letterSpacing: 2, marginBottom: 12,
        }}>
          You&apos;re Invited!
        </h1>

        {refCode && (
          <div style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid #2a2a2a',
            borderRadius: 10, padding: '10px 16px', marginBottom: 20,
            display: 'inline-block',
          }}>
            <span style={{ color: '#888', fontSize: 12, fontFamily: 'Space Mono, monospace' }}>
              Referral code: <strong style={{ color: '#fff' }}>{refCode}</strong>
            </span>
          </div>
        )}

        <p style={{
          color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, marginBottom: 28,
        }}>
          Your friend invited you to Fidge — spin, earn points, and win rewards together.
        </p>

        {/* 2. Manual trigger: Modal only opens when this is clicked */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#fff', color: '#000', border: 'none',
            borderRadius: 12, padding: '14px 32px',
            fontSize: 16, fontWeight: 700, cursor: 'pointer', width: '100%',
          }}
        >
          Accept Invite
        </button>

        <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          Already have an account?{' '}
          <button
            onClick={() => setShowModal(true)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}
          >
            Log in
          </button>
        </p>
      </div>

      {showModal && (
        <AuthModal
          onClose={() => setShowModal(false)} 
          defaultMode="register"
          prefillRefCode={refCode}
        />
      )}
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Loading..." style={{ height: 48, opacity: 0.5 }} />
      </div>  
    }>
      <JoinContent />
    </Suspense>
  );
}