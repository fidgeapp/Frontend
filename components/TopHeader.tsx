'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/AuthModal';

interface Props {
  title?: string;
  showConnect?: boolean;
  onMenuSelect?: (key: string) => void;
}

export default function TopHeader({ title, showConnect, onMenuSelect }: Props) {
  const { loggedIn, username, avatarColor, gems, logout } = useAuth();
  const [showAuth,     setShowAuth]     = useState(false);
  const [showUserDrop, setShowUserDrop] = useState(false);
  const [showMenuDrop, setShowMenuDrop] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenuDrop(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <header style={S.header}>
        {/* Left: logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Fidge" style={{ height: 28 }} />
          {title && <span style={S.title}>{title}</span>}
        </div>

        {/* Right: 3-dot menu + gems + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* 3-dot menu (legal links) */}
          {onMenuSelect && (
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button style={S.dotsBtn} onClick={() => setShowMenuDrop(p => !p)}>
                ⋮
              </button>
              {showMenuDrop && (
                <div style={S.dropdown}>
                  {(['terms', 'privacy', 'disclaimer'] as const).map(k => (
                    <button key={k} style={S.dropItem} onClick={() => { onMenuSelect(k); setShowMenuDrop(false); }}>
                      {k === 'terms' ? '📄 Terms' : k === 'privacy' ? '🔒 Privacy' : '⚠️ Disclaimer'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Gems badge (always visible when logged in) */}
          {loggedIn && (
            <div style={S.gemsBadge}>
              <span style={{ fontSize: 14 }}>💎</span>
              <span style={S.gemsText}>{gems}</span>
            </div>
          )}

          {/* User dropdown / Sign In */}
          {loggedIn ? (
            <div style={{ position: 'relative' }} ref={userRef}>
              <button style={S.avatar} onClick={() => setShowUserDrop(p => !p)}>
                <div style={{ ...S.dot, background: avatarColor ?? '#888' }} />
                <span style={S.usernameText}>{username}</span>
                <span style={{ color: '#666', fontSize: 11 }}>▼</span>
              </button>

              {showUserDrop && (
                <div style={S.dropdown} onClick={() => setShowUserDrop(false)}>
                  <button style={S.dropItem} onClick={() => { window.location.href = '/profile'; }}>
                    👤 Profile
                  </button>
                  <div style={S.divider} />
                  <button style={{ ...S.dropItem, color: '#ff6b6b' }} onClick={() => logout()}>
                    🚪 Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button style={S.connectBtn} onClick={() => setShowAuth(true)}>
              Sign In
            </button>
          )}
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px', borderBottom: '1px solid #1a1a1a',
    background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 100,
  },
  title: { color: '#fff', fontSize: 15, fontWeight: 700 },
  dotsBtn: {
    background: 'none', border: '1px solid #2a2a2a', borderRadius: 8,
    color: '#888', fontSize: 18, cursor: 'pointer', padding: '2px 8px',
    lineHeight: 1, display: 'flex', alignItems: 'center',
  },
  connectBtn: {
    background: '#fff', color: '#000', border: 'none',
    borderRadius: 10, padding: '8px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  gemsBadge: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: '#1a1a1a', borderRadius: 20, padding: '5px 12px',
  },
  gemsText: { color: '#fff', fontSize: 13, fontWeight: 600 },
  avatar: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
  },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  usernameText: { color: '#fff', fontSize: 13, fontWeight: 600 },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
    background: '#111', border: '1px solid #2a2a2a', borderRadius: 10,
    minWidth: 160, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 200,
  },
  dropItem: {
    display: 'block', width: '100%', padding: '11px 16px',
    background: 'none', border: 'none', color: '#fff',
    fontSize: 14, textAlign: 'left' as const, cursor: 'pointer',
  },
  divider: { height: 1, background: '#1a1a1a' },
};
