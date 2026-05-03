'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home', icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={a ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={a ? 'rgba(255,255,255,0.08)' : 'none'}/>
      <path d="M9 22V12h6v10" stroke={a ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/leaderboard', label: 'Leaderboard', icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="18" y="3" width="4" height="18" rx="1" fill={a ? '#fff' : 'rgba(255,255,255,0.3)'}/>
      <rect x="10" y="8" width="4" height="13" rx="1" fill={a ? '#fff' : 'rgba(255,255,255,0.25)'}/>
      <rect x="2" y="13" width="4" height="8" rx="1" fill={a ? '#fff' : 'rgba(255,255,255,0.2)'}/>
    </svg>
  )},
  { href: '/spinner', label: 'Spinner', icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke={a ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/shop', label: 'Shop', icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke={a ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2"/>
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke={a ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2"/>
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke={a ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2"/>
      <path d="M17 13v8M13 17h8" stroke={a ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/profile', label: 'Profile', icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={a ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2" fill={a ? 'rgba(255,255,255,0.08)' : 'none'}/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={a ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav suppressHydrationWarning style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(0,0,0,0.96)',
      backdropFilter: 'blur(32px)',
      borderTop: '1px solid rgba(255,255,255,0.12)',
      padding: '10px 0 22px',
      zIndex: 100,
    }}>
      {/* Top shine line */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
      }}/>

      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {navItems.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '4px 10px', position: 'relative',
            }}>
              {/* Active glow behind icon */}
              {active && (
                <div style={{
                  position: 'absolute', top: '2px',
                  width: '36px', height: '36px',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
                  borderRadius: '50%',
                }}/>
              )}
              {icon(active)}
              <span style={{
                fontSize: '10px', fontFamily: 'Rajdhani, sans-serif',
                fontWeight: active ? 700 : 500,
                color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)',
                letterSpacing: '0.8px', textTransform: 'uppercase',
                textShadow: active ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
              }}>
                {label}
              </span>
              {/* Active dot */}
              {active && (
                <div style={{
                  width: '3px', height: '3px', borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 0 6px rgba(255,255,255,0.8)',
                }}/>
              )}
            </Link>
          );
        })}
      </div>

      <div style={{
        textAlign: 'center', marginTop: '6px',
        fontSize: '9px', color: 'rgba(255,255,255,0.15)',
        letterSpacing: '2px', textTransform: 'uppercase',
        fontFamily: 'Space Mono, monospace',
      }}>
        @fidge_app
      </div>
    </nav>
  );
}
