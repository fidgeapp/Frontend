import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Providers from './Providers';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: "Fidge - Can't Stay Still",
  description: 'Fidge - The fidget spinner app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adProvider  = process.env.NEXT_PUBLIC_AD_PROVIDER;          // 'adsense' | 'adsterra' | 'both' | unset
  const adsenseId   = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const adsterraSrc = process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR;  // social bar script URL from Adsterra

  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ paddingBottom: '90px' }} suppressHydrationWarning>

        {/* Hydration fix — removes browser-extension injected attributes */}
        <Script
          id="clean-bis-skin"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){
              const clean = () => document.querySelectorAll('[bis_skin_checked]').forEach(el => el.removeAttribute('bis_skin_checked'));
              clean();
              const observer = new MutationObserver(clean);
              observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['bis_skin_checked'] });
              const stop = () => { clean(); observer.disconnect(); };
              setTimeout(stop, 1000);
              document.addEventListener('readystatechange', () => { if (document.readyState === 'complete') stop(); });
            })()`
          }}
        />

        {/* ── Google AdSense ── loads when provider is 'adsense' or 'both' */}
        {(adProvider === 'adsense' || adProvider === 'both') && adsenseId && (
          <Script
            id="google-adsense"
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
          />
        )}

        {/* ── Adsterra Social Bar ── passive revenue on all pages */}
        {(adProvider === 'adsterra' || adProvider === 'both') && adsterraSrc && (
          <Script
            id="adsterra-social-bar"
            strategy="lazyOnload"
            src={adsterraSrc}
            data-cfasync="false"
          />
        )}

        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
