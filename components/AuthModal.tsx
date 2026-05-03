'use client';

/**
 * AuthModal — Sign Up (email + OTP) and Login (email + password, direct).
 *
 * Sign Up flow (2 steps):
 *   1. Email, username, password → send OTP
 *   2. Enter 6-digit code → account created, logged in
 *
 * Login flow (1 step):
 *   Email + password → logged in immediately (no OTP)
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Auth } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'register';
type Step = 'form' | 'otp'; // otp only used for register

interface Props {
  onClose: () => void;
  defaultMode?: Mode;
  prefillRefCode?: string;
}

export default function AuthModal({ onClose, defaultMode = 'login', prefillRefCode = '' }: Props) {
  const { login } = useAuth();
  const [mode,    setMode]    = useState<Mode>(defaultMode);
  const [step,    setStep]    = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [refCode,  setRefCode]  = useState(prefillRefCode || (typeof window !== 'undefined' ? (sessionStorage.getItem('fidge_ref') ?? '') : ''));
  const [otp,      setOtp]      = useState('');
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRef.current?.focus(), 100);
  }, [step]);

  const reset = () => { setError(null); setSuccess(null); };

  const switchMode = (m: Mode) => {
    setMode(m); setStep('form'); setOtp(''); reset();
  };

  // ── Register step 1: send OTP ─────────────────────────────────────────────
  const handleRegisterSend = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true);
    try {
      await Auth.registerSendOtp({ email, username, password, ref_code: refCode || undefined });
      setSuccess(`We sent a 6-digit code to ${email}. Check your inbox.`);
      setStep('otp');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  // ── Register step 2: verify OTP ───────────────────────────────────────────
  const handleRegisterVerify = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true);
    try {
      const res = await Auth.registerVerify({ email, username, password, otp, ref_code: refCode || undefined });
      try { sessionStorage.removeItem('fidge_ref'); } catch {}
      login(res.user);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid code');
    } finally { setLoading(false); }
  };

  // ── Login: direct (no OTP) ────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true);
    try {
      const res = await Auth.login({ email, password });
      login(res.user);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid email or password');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    reset(); setLoading(true);
    try {
      await Auth.registerSendOtp({ email, username, password });
      setSuccess('New code sent!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not resend');
    } finally { setLoading(false); }
  };

  if (!mounted) return null;

  const content = (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.header}>
          <img src="/logo.png" alt="Fidge" style={{ height: 32, marginRight: 10 }} />
          <span style={S.title}>
            {step === 'otp' ? 'Enter your code' : mode === 'register' ? 'Create account' : 'Welcome back'}
          </span>
          <button style={S.close} onClick={onClose}>✕</button>
        </div>

        {/* Tab switcher */}
        {step === 'form' && (
          <div style={S.tabs}>
            <button style={mode === 'login'    ? S.tabActive : S.tab} onClick={() => switchMode('login')}>Log In</button>
            <button style={mode === 'register' ? S.tabActive : S.tab} onClick={() => switchMode('register')}>Sign Up</button>
          </div>
        )}

        {error   && <div style={S.errorBox}>{error}</div>}
        {success && <div style={S.successBox}>{success}</div>}

        {/* ── Login form ── */}
        {mode === 'login' && step === 'form' && (
          <form onSubmit={handleLogin} style={S.form}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />

            <label style={S.label}>Password</label>
            <input style={S.input} type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />

            <button style={loading ? S.btnDisabled : S.btn} type="submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>
        )}

        {/* ── Register: form ── */}
        {mode === 'register' && step === 'form' && (
          <form onSubmit={handleRegisterSend} style={S.form}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />

            <label style={S.label}>Username</label>
            <input style={S.input} type="text" placeholder="cool_username"
              value={username} onChange={e => setUsername(e.target.value)}
              minLength={3} maxLength={50} pattern="[a-zA-Z0-9_]+" required />

            <label style={S.label}>Password</label>
            <input style={S.input} type="password" placeholder="At least 8 characters"
              value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />

            <label style={S.label}>Referral code <span style={{ color: '#666' }}>(optional)</span></label>
            <input style={S.input} type="text" placeholder="ABCD1234"
              value={refCode} onChange={e => setRefCode(e.target.value.toUpperCase())} maxLength={20} />

            <button style={loading ? S.btnDisabled : S.btn} type="submit" disabled={loading}>
              {loading ? 'Sending code…' : 'Send verification code'}
            </button>
          </form>
        )}

        {/* ── Register: OTP ── */}
        {mode === 'register' && step === 'otp' && (
          <form onSubmit={handleRegisterVerify} style={S.form}>
            <label style={S.label}>6-digit code</label>
            <input ref={otpRef} style={{ ...S.input, ...S.otpInput }}
              type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              placeholder="000000" value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required />

            <button style={loading ? S.btnDisabled : S.btn} type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <div style={S.resendRow}>
              <span style={{ color: '#888', fontSize: 13 }}>Didn&apos;t get it?</span>
              <button type="button" style={S.linkBtn} onClick={handleResend} disabled={loading}>Resend</button>
              <button type="button" style={{ ...S.linkBtn, color: '#888', marginLeft: 'auto' }}
                onClick={() => { setStep('form'); reset(); setOtp(''); }}>← Back</button>
            </div>
          </form>
        )}

      </div>
    </div>
  );

  return createPortal(content, document.body);
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
  },
  modal: {
    background: '#111', border: '1px solid #2a2a2a', borderRadius: 16,
    width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  },
  header: { display: 'flex', alignItems: 'center', marginBottom: 20 },
  title:  { flex: 1, color: '#fff', fontSize: 18, fontWeight: 700 },
  close:  { background: 'none', border: 'none', color: '#666', fontSize: 18, cursor: 'pointer', padding: 4 },
  tabs: {
    display: 'flex', background: '#1a1a1a', borderRadius: 10, padding: 4, marginBottom: 20, gap: 4,
  },
  tab: {
    flex: 1, padding: '8px 0', background: 'none', border: 'none',
    color: '#888', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
  },
  tabActive: {
    flex: 1, padding: '8px 0', background: '#222', border: 'none',
    color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  form:  { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { color: '#aaa', fontSize: 13, fontWeight: 500, marginTop: 4 },
  input: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10,
    color: '#fff', fontSize: 15, padding: '12px 14px', outline: 'none',
    width: '100%', boxSizing: 'border-box' as const,
  },
  otpInput: { fontSize: 28, letterSpacing: 12, textAlign: 'center' as const, fontFamily: 'monospace' },
  btn: {
    marginTop: 12, background: '#fff', color: '#000', border: 'none',
    borderRadius: 10, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%',
  },
  btnDisabled: {
    marginTop: 12, background: '#333', color: '#666', border: 'none',
    borderRadius: 10, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: 'not-allowed', width: '100%',
  },
  errorBox: {
    background: '#2a1111', border: '1px solid #5a2020', borderRadius: 8,
    color: '#ff6b6b', padding: '10px 14px', fontSize: 13, marginBottom: 8,
  },
  successBox: {
    background: '#112a11', border: '1px solid #205a20', borderRadius: 8,
    color: '#6bff6b', padding: '10px 14px', fontSize: 13, marginBottom: 8,
  },
  resendRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' as const },
  linkBtn: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, textDecoration: 'underline', padding: 0 },
};
