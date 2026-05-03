'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import { Admin, AdminTokenStore } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Coupon {
  id:          number;
  code:        string;
  type:        'gems' | 'points';
  value:       number;
  max_uses:    number;
  used_count:  number;
  expiry_date: string | null;
  active:      boolean;
  created_at:  string;
  created_by:  string;
}

interface Stats {
  total_users:  number;
  active_today: number;
  total_points: number;
  total_gems:   number;
  banned_users: number;
}

interface PcedoWithdrawal {
  id:             number;
  username:       string;
  email:          string;
  amount:         number;
  wallet_address: string;
  status:         string;
  created_at:     string;
  processed_at:   string | null;
}

interface GemRequest {
  id:           number;
  username:     string;
  email:        string;
  gems:         number;
  eth_amount:   number;
  tx_hash:      string;
  status:       string;
  coupon_code:  string | null;
  submitted_at: string | null;
  created_at:   string;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [hydrated, setHydrated] = useState(false);
  const [authed,   setAuthed]   = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  // 2FA state
  const [requires2fa, setRequires2fa] = useState(false);
  const [otp,         setOtp]         = useState('');
  const [totpCode,    setTotpCode]    = useState('');

  // Data
  const [stats,            setStats]            = useState<Stats | null>(null);
  const [coupons,          setCoupons]          = useState<Coupon[]>([]);
  const [users,            setUsers]            = useState<any[]>([]);
  const [gemRequests,      setGemRequests]      = useState<GemRequest[]>([]);
  const [pcedoWithdrawals, setPcedoWithdrawals] = useState<PcedoWithdrawal[]>([]);
  const [pcedoWdFilter,    setPcedoWdFilter]    = useState<'pending' | 'processed'>('pending');
  const [gemFilter,        setGemFilter]        = useState<'submitted' | 'verified' | 'rejected'>('submitted');
  const [view,             setView]             = useState<'stats' | 'coupons' | 'gem-requests' | 'withdrawals' | 'users' | 'create'>('stats');
  const [search,           setSearch]           = useState('');

  // Create coupon form
  const [newCode,   setNewCode]   = useState('');
  const [newType,   setNewType]   = useState<'gems' | 'points'>('gems');
  const [newValue,  setNewValue]  = useState('');
  const [newMax,    setNewMax]    = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  useEffect(() => { setHydrated(true); }, []);

  // Check if already logged in
  useEffect(() => {
    if (typeof window !== 'undefined' && AdminTokenStore.get()) {
      setAuthed(true);
    }
  }, []);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Login handler (2-step: credentials → OTP+TOTP) ────────────────────────

  const handleLogin = async () => {
    if (!username || !password) { setLoginErr('Enter credentials'); return; }
    setLoading(true);
    setLoginErr('');
    try {
      const data = await Admin.login(
        username,
        password,
        requires2fa ? otp      : undefined,
        requires2fa ? totpCode : undefined,
      );

      if (data.requires_2fa) {
        // Credentials valid — OTP sent to email, show 2FA fields
        setRequires2fa(true);
      } else if (data.token) {
        // All factors verified — token already stored by Admin.login()
        setAuthed(true);
        setRequires2fa(false);
      } else {
        setLoginErr(data.error ?? 'Login failed');
      }
    } catch (e: any) {
      setLoginErr(e.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Admin.logout();
    setAuthed(false);
    setStats(null);
    setCoupons([]);
    setUsers([]);
  };

  // ── Data loaders ──────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try { setStats(await Admin.stats() as unknown as Stats); }
    catch { showToast('Failed to load stats', false); }
  }, []);

  const loadCoupons = useCallback(async () => {
    try {
      const res = await Admin.coupons('', search || '');
      setCoupons(res.coupons ?? []);
    } catch { showToast('Failed to load coupons', false); }
  }, [search]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await Admin.users(1, search || '');
      setUsers(res.data ?? []);
    } catch { showToast('Failed to load users', false); }
  }, [search]);

  const loadPcedoWithdrawals = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/withdrawals?status=${pcedoWdFilter}`, {
        headers: { 'X-Admin-Token': AdminTokenStore.get() ?? '' },
      });
      const d = await res.json();
      setPcedoWithdrawals(d.withdrawals ?? []);
    } catch { showToast('Failed to load withdrawals', false); }
  }, [pcedoWdFilter]);

  const loadGemRequests = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/gem-requests?status=${gemFilter}`, {
        headers: { 'X-Admin-Token': AdminTokenStore.get() ?? '' },
      });
      const d = await res.json();
      setGemRequests(d.requests ?? []);
    } catch { showToast('Failed to load gem requests', false); }
  }, [gemFilter]);

  const handleConfirmWithdrawal = async (id: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/withdrawals/${id}/confirm`, {
        method: 'POST',
        headers: { 'X-Admin-Token': AdminTokenStore.get() ?? '' },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      showToast('Withdrawal confirmed!');
      loadPcedoWithdrawals();
    } catch (e: any) { showToast(e.message ?? 'Failed', false); }
  };

  const handleDeleteWithdrawalAdmin = async (id: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/withdrawals/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': AdminTokenStore.get() ?? '' },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      showToast(d.message);
      loadPcedoWithdrawals();
    } catch (e: any) { showToast(e.message ?? 'Failed', false); }
  };

  const handleVerifyGem = async (id: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/gem-requests/${id}/verify`, {
        method: 'POST',
        headers: { 'X-Admin-Token': AdminTokenStore.get() ?? '' },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      showToast('Verified! Coupon: ' + d.coupon_code);
      loadGemRequests();
    } catch (e: any) { showToast(e.message ?? 'Failed', false); }
  };

  const handleRejectGem = async (id: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/gem-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'X-Admin-Token': AdminTokenStore.get() ?? '' },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('Rejected');
      loadGemRequests();
    } catch (e: any) { showToast(e.message ?? 'Failed', false); }
  };

  useEffect(() => {
    if (!authed) return;
    if (view === 'stats')        loadStats();
    if (view === 'coupons')      loadCoupons();
    if (view === 'users')        loadUsers();
    if (view === 'gem-requests') loadGemRequests();
    if (view === 'withdrawals')  loadPcedoWithdrawals();
  }, [authed, view, loadStats, loadCoupons, loadUsers, loadGemRequests, loadPcedoWithdrawals]);

  const handleCreateCoupon = async () => {
    if (!newCode || !newValue) { showToast('Fill in all fields', false); return; }
    try {
      await Admin.createCoupon({
        code:        newCode.toUpperCase(),
        type:        newType,
        value:       parseFloat(newValue),
        max_uses:    parseInt(newMax) || 0,
        expiry_date: newExpiry || undefined,
        created_by:  username,
      });
      showToast('Coupon created!');
      setNewCode(''); setNewValue(''); setNewMax(''); setNewExpiry('');
      setView('coupons');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to create coupon', false);
    }
  };

  const handleToggleCoupon = async (id: number) => {
    try {
      await Admin.toggleCoupon(id);
      loadCoupons();
      showToast('Coupon updated');
    } catch { showToast('Failed', false); }
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await Admin.deleteCoupon(id);
      loadCoupons();
      showToast('Coupon deleted');
    } catch { showToast('Failed', false); }
  };

  const handleBanUser = async (id: number, isBanned: boolean) => {
    try {
      await Admin.banUser(id);
      loadUsers();
      showToast(isBanned ? 'User unbanned' : 'User banned');
    } catch { showToast('Failed', false); }
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const card: React.CSSProperties  = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px 18px' };
  const input: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontFamily: 'Space Mono, monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
  const btn = (primary = false): React.CSSProperties => ({ padding: '12px 20px', borderRadius: '10px', border: primary ? 'none' : '1px solid rgba(255,255,255,0.15)', background: primary ? 'white' : 'transparent', color: primary ? 'black' : 'rgba(255,255,255,0.7)', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '12px', cursor: 'pointer', letterSpacing: '1px' });

  if (!hydrated) return null;

  // ── Login screen ──────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '20px', color: 'white', textAlign: 'center', marginBottom: '8px' }}>FIDGE ADMIN</p>

          {!requires2fa ? (
            /* Step 1: username + password */
            <>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" style={input} />
              <div style={{ position: 'relative' }}>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  style={input}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '12px' }}
                >
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </>
          ) : (
            /* Step 2: OTP (email) + TOTP (Google Authenticator) */
            <>
              <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'rgba(0,220,140,0.8)', textAlign: 'center', padding: '10px 12px', background: 'rgba(0,220,140,0.07)', borderRadius: '8px', border: '1px solid rgba(0,220,140,0.2)', lineHeight: 1.6 }}>
                ✉ OTP sent to admin email.<br />Enter both codes below.
              </p>
              <input
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6-digit OTP (from email)"
                maxLength={6}
                style={input}
              />
              <input
                value={totpCode}
                onChange={e => setTotpCode(e.target.value)}
                placeholder="Google Authenticator code"
                maxLength={6}
                style={input}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                onClick={() => { setRequires2fa(false); setOtp(''); setTotpCode(''); setLoginErr(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono, monospace', fontSize: '11px', cursor: 'pointer', textAlign: 'center' }}
              >
                ← Back to credentials
              </button>
            </>
          )}

          {loginErr && (
            <p style={{ color: '#ff9090', fontFamily: 'Space Mono, monospace', fontSize: '12px', textAlign: 'center' }}>
              {loginErr}
            </p>
          )}

          <button onClick={handleLogin} disabled={loading} style={btn(true)}>
            {loading ? 'PLEASE WAIT...' : requires2fa ? 'VERIFY & LOGIN' : 'LOGIN'}
          </button>
        </div>
      </main>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: 'white', padding: '20px 16px 40px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 999, padding: '12px 18px', borderRadius: '10px', background: toast.ok ? 'rgba(0,200,120,0.15)' : 'rgba(255,80,80,0.15)', border: `1px solid ${toast.ok ? 'rgba(0,200,120,0.4)' : 'rgba(255,80,80,0.4)'}`, color: toast.ok ? 'rgba(0,220,140,0.9)' : '#ff9090', fontFamily: 'Space Mono, monospace', fontSize: '12px' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '18px' }}>FIDGE ADMIN</p>
        <button onClick={handleLogout} style={btn()}>LOGOUT</button>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['stats', 'coupons', 'gem-requests', 'withdrawals', 'users', 'create'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ ...btn(view === v), padding: '8px 16px', fontSize: '11px' }}>
            {v === 'gem-requests' ? '💎 GEM ORDERS' : v === 'withdrawals' ? '🪙 PCEDO OUT' : v.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Stats view */}
      {view === 'stats' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {([
            ['Total Users',  stats.total_users],
            ['Active Today', stats.active_today],
            ['Total Points', Number(stats.total_points).toLocaleString()],
            ['Total Gems',   stats.total_gems],
            ['Banned',       stats.banned_users],
          ] as [string, number | string][]).map(([label, val]) => (
            <div key={label} style={card}>
              <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '6px' }}>{label.toUpperCase()}</p>
              <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '20px' }}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Coupons view */}
      {view === 'coupons' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); loadCoupons(); }} placeholder="Search coupons..." style={input} />
          {coupons.length === 0 ? (
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px' }}>No coupons found</p>
          ) : coupons.map(c => (
            <div key={c.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '13px', fontWeight: 700 }}>{c.code}</p>
                <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {c.value} {c.type} · {c.used_count}/{c.max_uses || '∞'} used · {c.active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => handleToggleCoupon(c.id)} style={btn()}>{c.active ? 'OFF' : 'ON'}</button>
                <button onClick={() => handleDeleteCoupon(c.id)} style={{ ...btn(), color: 'rgba(255,100,100,0.7)' }}>DEL</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users view */}
      {view === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); loadUsers(); }} placeholder="Search by username or email..." style={input} />
          {users.length === 0 ? (
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px' }}>No users found</p>
          ) : users.map((u: any) => (
            <div key={u.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {u.points} pts · {u.gems} gems · {u.referral_count} referrals
                </p>
              </div>
              <button onClick={() => handleBanUser(u.id, u.is_banned)} style={{ ...btn(), color: u.is_banned ? 'rgba(0,220,140,0.8)' : 'rgba(255,100,100,0.7)', flexShrink: 0 }}>
                {u.is_banned ? 'UNBAN' : 'BAN'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Gem purchase requests view */}
      {view === 'gem-requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {(['submitted', 'verified', 'rejected'] as const).map(f => (
              <button key={f} onClick={() => { setGemFilter(f); setTimeout(loadGemRequests, 50); }}
                style={{ ...btn(gemFilter === f), padding: '6px 12px', fontSize: '10px' }}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          {gemRequests.length === 0 ? (
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px' }}>
              No {gemFilter} requests
            </p>
          ) : gemRequests.map((r: GemRequest) => (
            <div key={r.id} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700 }}>{r.username}</p>
                  <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{r.email}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '16px', color: '#60a5fa' }}>💎 {r.gems}</p>
                  <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>{r.eth_amount} ETH</p>
                </div>
              </div>
              {r.tx_hash && (
                <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: 'rgba(255,200,80,0.7)', wordBreak: 'break-all', marginBottom: 8, lineHeight: 1.5 }}>
                  TX: {r.tx_hash}
                </p>
              )}
              {r.coupon_code && (
                <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: '#34d399', marginBottom: 8 }}>
                  Coupon: {r.coupon_code}
                </p>
              )}
              <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>
                {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : new Date(r.created_at).toLocaleString()}
              </p>
              {r.status === 'submitted' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleVerifyGem(r.id)}
                    style={{ ...btn(true), flex: 1, background: 'rgba(52,211,153,0.2)', borderColor: 'rgba(52,211,153,0.4)', color: '#34d399' }}>
                    ✓ VERIFY
                  </button>
                  <button onClick={() => handleRejectGem(r.id)}
                    style={{ ...btn(), flex: 1, color: 'rgba(255,100,100,0.7)' }}>
                    ✗ REJECT
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PCEDO Withdrawals view */}
      {view === 'withdrawals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {(['pending', 'processed'] as const).map(f => (
              <button key={f} onClick={() => { setPcedoWdFilter(f); setTimeout(loadPcedoWithdrawals, 50); }}
                style={{ ...btn(pcedoWdFilter === f), padding: '6px 12px', fontSize: '10px' }}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          {pcedoWithdrawals.length === 0 ? (
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px' }}>
              No {pcedoWdFilter} withdrawals
            </p>
          ) : pcedoWithdrawals.map((w: PcedoWithdrawal) => (
            <div key={w.id} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700 }}>{w.username}</p>
                  <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{w.email}</p>
                </div>
                <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '16px', color: '#BB8FCE' }}>
                  {parseFloat(String(w.amount)).toFixed(4)} $PCEDO
                </p>
              </div>
              <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: 'rgba(96,165,250,0.7)', wordBreak: 'break-all', marginBottom: 6 }}>
                → {w.wallet_address}
              </p>
              <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>
                {new Date(w.created_at).toLocaleString()}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {w.status === 'pending' && (
                  <button onClick={() => handleConfirmWithdrawal(w.id)}
                    style={{ ...btn(true), flex: 1, background: 'rgba(52,211,153,0.15)', borderColor: 'rgba(52,211,153,0.4)', color: '#34d399' }}>
                    ✓ CONFIRM SENT
                  </button>
                )}
                <button onClick={() => handleDeleteWithdrawalAdmin(w.id)}
                  style={{ ...btn(), flex: 1, color: 'rgba(255,100,100,0.7)' }}>
                  🗑 DELETE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create coupon view */}
      {view === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '400px' }}>
          <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '14px', color: 'white' }}>CREATE COUPON</p>
          <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="CODE (e.g. LAUNCH50)" style={input} />
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['gems', 'points'] as const).map(t => (
              <button key={t} onClick={() => setNewType(t)} style={{ ...btn(newType === t), flex: 1 }}>{t.toUpperCase()}</button>
            ))}
          </div>
          <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Value (e.g. 10)" type="number" style={input} />
          <input value={newMax} onChange={e => setNewMax(e.target.value)} placeholder="Max uses (0 = unlimited)" type="number" style={input} />
          <input value={newExpiry} onChange={e => setNewExpiry(e.target.value)} placeholder="Expiry date (optional)" type="date" style={{ ...input, colorScheme: 'dark' }} />
          <button onClick={handleCreateCoupon} style={btn(true)}>CREATE COUPON</button>
        </div>
      )}

    </main>
  );
}
