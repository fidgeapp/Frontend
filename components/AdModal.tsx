'use client';

/**
 * AdModal — Fidge Ad System
 *
 * Shows a REAL ad inside the modal using Adsterra's Direct Link as an iframe.
 * No redirects, no new tabs — the ad plays inside the modal with a countdown.
 * After countdown → Claim +20% Energy → backend awards energy.
 *
 * ADSTERRA: Uses Direct Link URL rendered in an <iframe> inside the modal.
 *   Set NEXT_PUBLIC_ADSTERRA_DIRECT_LINK = your Adsterra direct link URL
 *
 * ADSENSE: Uses <ins> display unit inside the modal.
 *   Set NEXT_PUBLIC_ADSENSE_CLIENT + NEXT_PUBLIC_ADSENSE_SLOT
 *
 * BOTH: AdSense ins unit visible + Social Bar passive on all pages.
 *
 * DEV: Placeholder shown, countdown + claim still work for testing.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdComplete: () => Promise<void>;
}

declare global {
  interface Window { adsbygoogle?: unknown[]; }
}

type Provider = 'adsense' | 'adsterra' | 'both' | 'dev';

function getProvider(): Provider {
  const p = process.env.NEXT_PUBLIC_AD_PROVIDER;
  if (p === 'adsense')  return 'adsense';
  if (p === 'adsterra') return 'adsterra';
  if (p === 'both')     return 'both';
  return 'dev';
}

function getWatchSeconds(provider: Provider): number {
  if (provider === 'adsterra') return 15;
  if (provider === 'both')     return 10;
  if (provider === 'adsense')  return 5;
  return 5;
}


/**
 * AdBannerContainer — Loads Adsterra ad via iframe.
 *
 * ADSTERRA SETUP:
 *   1. In Adsterra dashboard → create a "Banner" ad zone (300x250 or 320x50)
 *   2. Copy the "Direct Link" URL (looks like: https://www.highperformanceformat.com/xxxxxxxx/invoke.js)
 *      OR use the iframe embed src they provide.
 *   3. Set in your .env:
 *        NEXT_PUBLIC_AD_PROVIDER=adsterra
 *        NEXT_PUBLIC_ADSTERRA_DIRECT_LINK=https://www.highperformanceformat.com/YOUR_ZONE_ID/invoke.js
 *
 * If you have a Banner Zone script URL (invoke.js), we inject it as a script.
 * If you have a Direct Link URL (not .js), we load it in an iframe.
 */
function AdBannerContainer({ scriptUrl }: { scriptUrl: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isScript = scriptUrl.endsWith('.js') || scriptUrl.includes('invoke');

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';

    if (isScript) {
      // Script-based banner (invoke.js) — inject script tag
      const atOptions = document.createElement('script');
      atOptions.text = `var atOptions = { 'key': '', 'format': 'iframe', 'height': 250, 'width': 300, 'params': {} };`;
      ref.current.appendChild(atOptions);

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      ref.current.appendChild(script);
    } else {
      // Direct link — load in iframe
      const iframe = document.createElement('iframe');
      iframe.src = scriptUrl;
      iframe.style.width = '100%';
      iframe.style.height = '300px';
      iframe.style.border = 'none';
      iframe.scrolling = 'no';
      iframe.setAttribute('allowfullscreen', 'true');
      ref.current.appendChild(iframe);
    }

    return () => { if (ref.current) ref.current.innerHTML = ''; };
  }, [scriptUrl, isScript]);

  return (
    <div
      ref={ref}
      style={{ width: '100%', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}
    />
  );
}

export default function AdModal({ open, onClose, onAdComplete }: Props) {
  const provider   = getProvider();
  const WATCH_SECS = getWatchSeconds(provider);

  const [countdown, setCountdown] = useState(WATCH_SECS);
  const [claiming,  setClaiming]  = useState(false);
  const [claimed,   setClaimed]   = useState(false);
  const [adReady,   setAdReady]   = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clientId    = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slotId      = process.env.NEXT_PUBLIC_ADSENSE_SLOT;
  // NEXT_PUBLIC_ADSTERRA_DIRECT_LINK should be the Banner script src URL (HTTPS)
  const directLink  = process.env.NEXT_PUBLIC_ADSTERRA_DIRECT_LINK;

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setCountdown(WATCH_SECS);
    setClaimed(false);
    setClaiming(false);
    setAdReady(false);
  }, [open, WATCH_SECS]);

  // Start countdown
  const startCountdown = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setAdReady(true);
    intervalRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(intervalRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Start countdown after modal opens (slight delay for ad to load)
  useEffect(() => {
    if (!open) return;
    const delay = provider === 'adsense' ? 1800 : 800;
    const t = setTimeout(() => {
      startCountdown();
      // Push AdSense unit
      if ((provider === 'adsense' || provider === 'both') && clientId) {
        try {
          window.adsbygoogle = window.adsbygoogle ?? [];
          (window.adsbygoogle as unknown[]).push({});
        } catch {}
      }
    }, delay);
    return () => clearTimeout(t);
  }, [open, provider, clientId, startCountdown]);

  const handleClaim = async () => {
    if (countdown > 0 || claiming || claimed) return;
    setClaiming(true);
    try {
      await onAdComplete();
      setClaimed(true);
      setTimeout(onClose, 900);
    } catch { setClaiming(false); }
  };

  if (!open) return null;

  const canClaim = countdown === 0 && !claiming && !claimed;
  const progress = ((WATCH_SECS - countdown) / WATCH_SECS) * 100;

  const showDirectLink = (provider === 'adsterra') && directLink;
  const showAdsense    = (provider === 'adsense' || provider === 'both') && clientId && slotId;
  const showDev        = !showDirectLink && !showAdsense;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.98)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      {/* Header row */}
      <div style={{ width: '100%', maxWidth: 420, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
          SPONSORED AD
        </p>
        {countdown === 0 && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        )}
        {countdown > 0 && (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 13, color: 'white' }}>
            {countdown}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 420, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', width: `${progress}%`, transition: 'width 1s linear' }}/>
      </div>

      {/* ── AD CONTENT ── */}
      <div style={{ width: '100%', maxWidth: 420, flex: 1, maxHeight: 380, borderRadius: 14, overflow: 'hidden', marginBottom: 14, position: 'relative', background: '#111' }}>

        {/* Adsterra Banner — script injected into container div (always HTTPS) */}
        {showDirectLink && (
          <AdBannerContainer scriptUrl={directLink} />
        )}

        {/* AdSense display unit */}
        {showAdsense && (
          <div style={{ padding: 8 }}>
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '100%', minHeight: 280 }}
              data-ad-client={clientId}
              data-ad-slot={slotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        )}

        {/* Dev placeholder */}
        {showDev && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, textAlign: 'center', padding: 24 }}>
            <p style={{ fontSize: 52, marginBottom: 16 }}>📢</p>
            <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10 }}>AD PLACEHOLDER</p>
            <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.18)', lineHeight: 1.9 }}>
              Set NEXT_PUBLIC_AD_PROVIDER + env vars{'\n'}
              to show real ads here
            </p>
          </div>
        )}

        {/* Countdown overlay — semi-transparent over the ad */}
        {countdown > 0 && adReady && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
            padding: '20px 16px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
              Ad ends in {countdown}s
            </p>
          </div>
        )}
      </div>

      {/* Reward pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '5px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20 }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <span style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Reward: <span style={{ color: '#34d399' }}>+20% Energy</span>
        </span>
      </div>

      {/* Claim button */}
      <div style={{ width: '100%', maxWidth: 420 }}>
        {claimed ? (
          <div style={{ width: '100%', padding: 15, textAlign: 'center', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 14, color: '#34d399', fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>
            ✓ +20% ENERGY CLAIMED!
          </div>
        ) : (
          <button onClick={handleClaim} disabled={!canClaim} style={{
            width: '100%', padding: 15,
            background: canClaim ? 'linear-gradient(135deg,rgba(52,211,153,0.22),rgba(96,165,250,0.22))' : 'rgba(255,255,255,0.04)',
            border: canClaim ? '1px solid rgba(52,211,153,0.45)' : '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, color: canClaim ? '#34d399' : 'rgba(255,255,255,0.3)',
            fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 14,
            cursor: canClaim ? 'pointer' : 'not-allowed', letterSpacing: 1, transition: 'all 0.3s',
          }}>
            {claiming ? 'CLAIMING…' : countdown > 0 ? `SKIP IN ${countdown}s` : 'CLAIM +20% ENERGY'}
          </button>
        )}
        <p style={{ marginTop: 8, fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.14)', textAlign: 'center' }}>
          Watching ads keeps Fidge free · Thank you 🙏
        </p>
      </div>
    </div>
  );
}
