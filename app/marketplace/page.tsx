'use client';
export const dynamic = 'force-dynamic';

/**
 * Gem Marketplace
 * - Opens in new tab from shop, prompts sign-in in the new tab
 * - Wallet detection: injected (MetaMask, Trust, Binance, Farcaster) first
 * - Falls back to ethers.js BrowserProvider to detect ANY EIP-1193 wallet
 * - Deep links for Trust, MetaMask, Farcaster, Binance if no injected wallet
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import TopHeader from '@/components/TopHeader';
import BottomNav from '@/components/BottomNav';
import LegalModal, { ModalType } from '@/components/LegalModal';
import { useAuth } from '@/context/AuthContext';
import { Marketplace, Coupons } from '@/lib/api';

interface Package { gems: number; usd: number; eth_amount: number; }
interface PurchaseRequest {
  id: number; gems: number; eth_amount: number;
  status: 'pending' | 'submitted' | 'verified' | 'rejected';
  coupon_code: string | null; submitted_at: string | null; created_at: string;
}
type Step = 'packages' | 'orders';

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: '⏳ Pending' },
  submitted: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  label: '🔍 Verifying' },
  verified:  { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  label: '✓ Verified' },
  rejected:  { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: '✗ Rejected' },
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
      isTrust?: boolean;
      isBinance?: boolean;
      isCoinbaseWallet?: boolean;
      providers?: Window['ethereum'][];
    };
  }
}

function toHex(eth: number): string {
  return '0x' + BigInt(Math.round(eth * 1e18)).toString(16);
}

// Detect wallet name from injected provider
function detectWalletName(eth: Window['ethereum']): string {
  if (!eth) return 'Wallet';
  if (eth.isTrust)          return 'Trust Wallet';
  if (eth.isBinance)        return 'Binance Web3';
  if (eth.isMetaMask)       return 'MetaMask';
  if (eth.isCoinbaseWallet) return 'Coinbase Wallet';
  return 'Web3 Wallet';
}

// ── Login gate for marketplace ─────────────────────────────────────────────────
function MarketplaceLoginGate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>💎</div>
      <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 10, letterSpacing: 1 }}>
        SIGN IN TO BUY GEMS
      </p>
      <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 300, lineHeight: 1.6, marginBottom: 28 }}>
        You need a Fidge account to purchase gems. Sign in or register to continue.
      </p>
      <div style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 14, padding: '16px 20px', maxWidth: 300, width: '100%', marginBottom: 20 }}>
        <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10 }}>HOW IT WORKS</p>
        {[
          '1. Sign in with your Fidge account',
          '2. Choose a gem package',
          '3. Pay with ETH from your wallet',
          '4. Receive a gem coupon code',
          '5. Redeem in Shop or Marketplace',
        ].map((step, i) => (
          <p key={i} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textAlign: 'left' }}>{step}</p>
        ))}
      </div>
      <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
        Tap <b style={{ color: 'rgba(255,255,255,0.5)' }}>Connect</b> in the top bar to sign in
      </p>
    </div>
  );
}

export default function MarketplacePage() {
  const { loggedIn, gems, applyUserPatch } = useAuth();
  const [modal, setModal]                   = useState<ModalType>(null);
  const [step, setStep]                     = useState<Step>('packages');
  const [packages, setPackages]             = useState<Package[]>([]);
  const [walletAddr, setWalletAddr]         = useState('');
  const [ethPrice, setEthPrice]             = useState(3000);
  const [error, setError]                   = useState('');
  const [connectedWallet, setConnectedWallet] = useState('');
  const [walletName, setWalletName]           = useState('');
  const [connecting, setConnecting]           = useState(false);
  const [sending, setSending]                 = useState<number | null>(null);
  const [txStatus, setTxStatus]               = useState('');
  const [txHash, setTxHash]                   = useState('');
  const [orders, setOrders]                   = useState<PurchaseRequest[]>([]);
  const [ordersLoading, setOrdersLoading]     = useState(false);
  const [redeemCode, setRedeemCode]           = useState('');
  const [redeemMsg, setRedeemMsg]             = useState('');
  const [redeemOk, setRedeemOk]               = useState(false);
  const [redeeming, setRedeeming]             = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasInjected = typeof window !== 'undefined' && !!window.ethereum;

  const WALLETS = [
    {
      name: 'MetaMask',
      emoji: '🦊',
      color: '#FF8600',
      deepLink: `https://metamask.app.link/dapp/${typeof window !== 'undefined' ? window.location.host + window.location.pathname : 'fidge.app/marketplace'}`,
    },
    {
      name: 'Trust Wallet',
      emoji: '🛡️',
      color: '#3375FF',
      deepLink: `https://link.trustwallet.com/open_url?coin_id=60&url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : 'https%3A%2F%2Ffidge.app%2Fmarketplace'}`,
    },
  ];

  useEffect(() => {
    Marketplace.packages().then(d => {
      setPackages(d.packages ?? []);
      const w = d.wallet_address;
      setWalletAddr((w && w !== 'NOT_CONFIGURED') ? w : (process.env.NEXT_PUBLIC_ETH_WALLET ?? ''));
      setEthPrice(d.eth_price_usd ?? 3000);
    }).catch(() => {});

    // Auto-detect already-connected wallet using ethers.js BrowserProvider pattern
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((a: unknown) => {
        const accs = a as string[];
        if (accs?.length) {
          setConnectedWallet(accs[0]);
          setWalletName(detectWalletName(window.ethereum!));
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const loadOrders = useCallback(async () => {
    if (!loggedIn) return;
    setOrdersLoading(true);
    try { const d = await Marketplace.status(); setOrders(d.requests ?? []); }
    catch {} finally { setOrdersLoading(false); }
  }, [loggedIn]);

  useEffect(() => { if (step === 'orders') loadOrders(); }, [step, loadOrders]);

  // ── Universal wallet connect using ethers.js BrowserProvider ─────────────────
  const connectWallet = async () => {
    setConnecting(true); setError('');
    try {
      // Try named wallet providers first
      let provider = window.ethereum;

      // Some browsers inject multiple providers — find the right one
      if (window.ethereum?.providers?.length) {
        // Prefer trust > binance > metamask > first available
        provider = window.ethereum.providers.find(p => p.isTrust)
          ?? window.ethereum.providers.find(p => p.isBinance)
          ?? window.ethereum.providers.find(p => p.isMetaMask)
          ?? window.ethereum.providers[0];
      }

      if (!provider) {
        setError('No Web3 wallet detected. Open this page in your wallet browser.');
        return;
      }

      // Use EIP-1193 directly (same as ethers.js BrowserProvider internally)
      const accs = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      if (accs?.length) {
        setConnectedWallet(accs[0]);
        setWalletName(detectWalletName(provider));
      }
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err.code !== 4001) setError(err.message ?? 'Could not connect wallet.');
    } finally {
      setConnecting(false);
    }
  };

  const handleBuy = async (pkg: Package) => {
    if (!loggedIn) { setError('Sign in first'); return; }
    if (!walletAddr) { setError('Payment wallet not configured'); return; }
    if (!connectedWallet) { await connectWallet(); return; }
    setError(''); setSending(pkg.gems); setTxStatus('Waiting for wallet approval…'); setTxHash('');

    // Resolve provider (same multi-provider logic)
    let provider = window.ethereum;
    if (window.ethereum?.providers?.length) {
      provider = window.ethereum.providers.find(p => p.isTrust)
        ?? window.ethereum.providers.find(p => p.isBinance)
        ?? window.ethereum.providers.find(p => p.isMetaMask)
        ?? window.ethereum.providers[0];
    }

    try {
      const initRes  = await Marketplace.initiate(pkg.gems);
      const requestId: number = initRes.request_id;
      const hash = await provider!.request({
        method: 'eth_sendTransaction',
        params: [{ from: connectedWallet, to: walletAddr, value: toHex(pkg.eth_amount), gas: '0x5208' }],
      }) as string;
      setTxHash(hash);
      setTxStatus('Transaction sent! Auto-verifying…');
      await Marketplace.submitTx(requestId, hash);
      setTxStatus('✓ Submitted! Check My Orders for your coupon.');
      pollRef.current = setInterval(async () => {
        try {
          const s = await Marketplace.status();
          const req = (s.requests as PurchaseRequest[]).find(r => r.id === requestId);
          if (req?.status === 'verified' || req?.status === 'rejected') {
            clearInterval(pollRef.current!); setTxStatus(''); setSending(null);
            setOrders(s.requests ?? []); setStep('orders');
          }
        } catch {}
      }, 6000);
      setTimeout(() => {
        if (pollRef.current) { clearInterval(pollRef.current); setSending(null); setTxStatus(''); setStep('orders'); }
      }, 300000);
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      setSending(null); setTxStatus('');
      if (err.code === 4001 || err.message?.includes('rejected')) setError('Transaction rejected.');
      else setError(err.message ?? 'Transaction failed.');
    }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true); setRedeemMsg('');
    try {
      const data = await Coupons.redeem(redeemCode.trim().toUpperCase());
      setRedeemMsg(data.message); setRedeemOk(true); setRedeemCode('');
      if (data.gems !== undefined) applyUserPatch({ gems: data.gems });
    } catch (e: unknown) { setRedeemMsg((e as { message?: string }).message ?? 'Failed'); setRedeemOk(false); }
    finally { setRedeeming(false); }
  };

  const walletShort = connectedWallet ? connectedWallet.slice(0, 6) + '…' + connectedWallet.slice(-4) : '';

  return (
    <main style={{ minHeight: '100vh', background: '#000', position: 'relative', overflow: 'hidden', WebkitTapHighlightColor: 'transparent' as any }}>
      <style>{`@keyframes _p{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <TopHeader title="Marketplace" showConnect onMenuSelect={k => setModal(k as ModalType)} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 140% 60% at 50% -5%, rgba(96,165,250,0.1) 0%, transparent 60%)' }} />
      <div className="dot-bg" style={{ position: 'absolute', inset: 0, opacity: 0.2, pointerEvents: 'none' }} />

      {/* ── Login gate ── */}
      {!loggedIn ? (
        <MarketplaceLoginGate />
      ) : (
        <div style={{ position: 'relative', zIndex: 1, paddingBottom: 100 }}>
          <div style={{ padding: '20px 16px 0' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <h1 style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: 2 }}>💎 GEM STORE</h1>
                <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Buy gems · Redeem coupon · Use in Shop</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 14px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 18, color: '#fff' }}>{gems}</p>
                <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>YOUR GEMS</p>
              </div>
            </div>

            {/* Wallet bar */}
            <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px' }}>
              {connectedWallet ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: '#34d399', letterSpacing: 1 }}>{walletName} CONNECTED</p>
                    <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{walletShort}</p>
                  </div>
                  <button onClick={() => { setConnectedWallet(''); setWalletName(''); }}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Mono,monospace', fontSize: 9, cursor: 'pointer' }}>
                    Disconnect
                  </button>
                </div>
              ) : hasInjected ? (
                /* Inside a wallet browser — show Connect button */
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                  <p style={{ flex: 1, fontFamily: 'Rajdhani,sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {detectWalletName(window.ethereum!)} detected — connect to pay with ETH
                  </p>
                  <button onClick={connectWallet} disabled={connecting}
                    style={{ background: connecting ? 'rgba(255,255,255,0.05)' : 'white', color: connecting ? '#555' : '#000', border: 'none', borderRadius: 10, padding: '8px 18px', fontFamily: 'Orbitron,sans-serif', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 1, flexShrink: 0 }}>
                    {connecting ? '…' : 'CONNECT'}
                  </button>
                </div>
              ) : (
                /* External browser — deep links + "any other wallet" hint */
                <div>
                  <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                    Open in your wallet's browser to pay with ETH:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {WALLETS.map(w => (
                      <a key={w.name} href={w.deepLink}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${w.color}33`, borderRadius: 10, textDecoration: 'none', transition: 'all .2s' }}>
                        <span style={{ fontSize: 18 }}>{w.emoji}</span>
                        <span style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: 13, color: w.color }}>{w.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>→</span>
                      </a>
                    ))}
                  </div>
                  {/* Universal fallback — any EIP-1193 wallet */}
                  <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>🌐</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Other Wallet</p>
                      <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>Open this page inside any Web3 wallet browser</p>
                    </div>
                    <button onClick={connectWallet} disabled={connecting}
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', color: 'white', fontFamily: 'Orbitron,sans-serif', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      {connecting ? '…' : 'TRY CONNECT'}
                    </button>
                  </div>
                  <p style={{ marginTop: 8, fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                    Tap a wallet above · Returns to this page automatically
                  </p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
              {(['packages', 'orders'] as const).map(t => (
                <button key={t} onClick={() => { setStep(t); setError(''); }}
                  style={{ flex: 1, padding: '9px 0', background: step === t ? 'rgba(255,255,255,0.1)' : 'transparent', border: `1px solid ${step === t ? 'rgba(255,255,255,0.2)' : 'transparent'}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: 13, color: step === t ? '#fff' : 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {t === 'packages' ? '💎 Buy Gems' : '📋 My Orders'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, color: '#f87171', fontFamily: 'Rajdhani,sans-serif', fontSize: 13 }}>{error}</div>
          )}
          {txStatus && (
            <div style={{ margin: '12px 16px 0', padding: '12px 14px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', animation: '_p 1s ease infinite', flexShrink: 0 }} />
                <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 13, color: '#60a5fa' }}>{txStatus}</p>
              </div>
              {txHash && <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 6, wordBreak: 'break-all' }}>TX: {txHash}</p>}
            </div>
          )}

          {step === 'packages' && (
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {packages.map(pkg => {
                  const isBest = pkg.gems === 1600;
                  const isBuying = sending === pkg.gems;
                  return (
                    <button key={pkg.gems} onClick={() => handleBuy(pkg)} disabled={!!sending}
                      style={{ position: 'relative', background: isBest ? 'rgba(96,165,250,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isBest ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 16, padding: '18px 12px', cursor: sending ? 'not-allowed' : 'pointer', textAlign: 'center', opacity: sending && !isBuying ? 0.5 : 1 }}>
                      {isBest && (
                        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#60a5fa', borderRadius: 6, padding: '2px 10px', fontFamily: 'Space Mono,monospace', fontSize: 9, fontWeight: 700, color: '#000', whiteSpace: 'nowrap' }}>BEST VALUE</div>
                      )}
                      <div style={{ fontSize: 28, marginBottom: 4 }}>💎</div>
                      <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 20, color: '#fff', marginBottom: 2 }}>{pkg.gems.toLocaleString()}</p>
                      <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 10 }}>GEMS</p>
                      <div style={{ background: isBuying ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 6px' }}>
                        {isBuying
                          ? <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: '#60a5fa' }}>Confirm in wallet…</p>
                          : <><p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 14, color: '#fff' }}>${pkg.usd}</p><p style={{ fontFamily: 'Space Mono,monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{pkg.eth_amount} ETH</p></>
                        }
                      </div>
                      <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>${(pkg.usd / pkg.gems).toFixed(3)}/gem</p>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 16, background: 'white', borderRadius: 2 }} />
                  <p style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 13, color: 'white', letterSpacing: 2 }}>REDEEM COUPON</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="GEM-XXXXXXXX" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontFamily: 'Space Mono,monospace', fontSize: 13, outline: 'none' }} />
                  <button onClick={handleRedeem} disabled={redeeming || !redeemCode.trim()}
                    style={{ padding: '0 18px', background: redeemCode.trim() ? 'white' : 'rgba(255,255,255,0.08)', color: redeemCode.trim() ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: 10, fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 12, cursor: redeemCode.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                    {redeeming ? '…' : 'REDEEM'}
                  </button>
                </div>
                {redeemMsg && <p style={{ marginTop: 8, fontFamily: 'Rajdhani,sans-serif', fontSize: 13, color: redeemOk ? '#34d399' : '#f87171' }}>{redeemMsg}</p>}
              </div>
            </div>
          )}

          {step === 'orders' && (
            <div style={{ padding: '16px 16px 0' }}>
              {ordersLoading
                ? <p style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono,monospace', fontSize: 12 }}>Loading…</p>
                : orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
                    <p style={{ fontSize: 32, marginBottom: 12 }}>📭</p>
                    <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>No orders yet</p>
                    <button onClick={() => setStep('packages')} style={{ marginTop: 16, padding: '10px 24px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontFamily: 'Rajdhani,sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Buy Gems</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {orders.map(order => {
                      const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending;
                      return (
                        <div key={order.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>💎 {order.gems.toLocaleString()}</span>
                              <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{order.eth_amount} ETH</span>
                            </div>
                            <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.color}40`, borderRadius: 6, padding: '3px 8px' }}>{s.label}</span>
                          </div>
                          <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          {order.status === 'verified' && order.coupon_code && (
                            <div style={{ marginTop: 10, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 10, padding: '12px' }}>
                              <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: 'rgba(52,211,153,0.7)', letterSpacing: 1, marginBottom: 6 }}>COUPON CODE</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <p style={{ fontFamily: 'Space Mono,monospace', fontSize: 15, color: '#34d399', fontWeight: 700, flex: 1, letterSpacing: 2 }}>{order.coupon_code}</p>
                                <button onClick={() => { setRedeemCode(order.coupon_code ?? ''); setStep('packages'); }}
                                  style={{ padding: '6px 12px', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, color: '#34d399', fontFamily: 'Rajdhani,sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                  REDEEM →
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}
        </div>
      )}

      <BottomNav />
      {modal && <LegalModal type={modal} onClose={() => setModal(null)} />}
    </main>
  );
}
