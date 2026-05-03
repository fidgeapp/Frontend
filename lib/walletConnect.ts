/**
 * walletConnect.ts
 *
 * Universal wallet connection using WalletConnect v2.
 * Works with MetaMask, Trust Wallet, Coinbase Wallet, Rainbow,
 * Ledger, Farcaster (Warpcast), and 400+ others — in ANY browser.
 *
 * Get a free projectId at https://cloud.walletconnect.com
 * Set NEXT_PUBLIC_WC_PROJECT_ID in Vercel env vars.
 */

let provider: any = null;

export async function getWCProvider() {
  if (provider) return provider;

  const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'YOUR_WC_PROJECT_ID';

  // Dynamic import so it doesn't break SSR
  const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

  provider = await EthereumProvider.init({
    projectId,
    chains: [1], // Ethereum mainnet
    showQrModal: true,
    metadata: {
      name:        'Fidge',
      description: 'Spin, earn, and compete on Fidge',
      url:         'https://fidge-email.vercel.app',
      icons:       ['https://fidge-email.vercel.app/logo.png'],
    },
  });

  return provider;
}

export async function wcConnect(): Promise<string> {
  const prov = await getWCProvider();
  await prov.connect();
  const accounts: string[] = await prov.request({ method: 'eth_accounts' });
  return accounts[0];
}

export async function wcDisconnect() {
  if (provider) {
    try { await provider.disconnect(); } catch {}
    provider = null;
  }
}

export async function wcSendTransaction(params: {
  from: string;
  to:   string;
  value: string; // hex wei
}): Promise<string> {
  const prov = await getWCProvider();
  return prov.request({ method: 'eth_sendTransaction', params: [params] }) as Promise<string>;
}

export function toHex(ethAmount: number): string {
  const wei = BigInt(Math.round(ethAmount * 1e18));
  return '0x' + wei.toString(16);
}
