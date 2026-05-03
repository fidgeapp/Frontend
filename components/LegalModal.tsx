'use client';
import { useState } from 'react';

export type ModalType = 'privacy' | 'terms' | 'disclaimer' | 'settings' | null;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '12px', color: 'white', marginBottom: '10px', letterSpacing: '1px' }}>{title}</p>
      <div style={{ fontFamily: 'Rajdhani', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}
function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <p style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '14px', color: 'rgba(255,255,255,0.75)', marginBottom: '5px' }}>{title}</p>
      <div style={{ fontFamily: 'Rajdhani', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}
function Bullet({ children }: { children: React.ReactNode }) {
  return <p style={{ paddingLeft: '12px', marginBottom: '3px' }}>• {children}</p>;
}
function LastUpdated({ date }: { date: string }) {
  return <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginBottom: '22px' }}>Last Updated: {date}</p>;
}
function ContactBlock() {
  return (
    <div style={{ marginTop: '6px' }}>
      <Bullet>Discord: <a href="https://discord.com/invite/QU63PTpYne" style={{ color: 'rgba(255,255,255,0.55)' }}>linktr.ee/cedomisofficial</a></Bullet>
      <Bullet>Website: <a href="https://fidge.app" style={{ color: 'rgba(255,255,255,0.55)' }}>fidge.app</a></Bullet>
      <Bullet>Email: <a href="mailto:fidgeappofficial@gmail.com" style={{ color: 'rgba(255,255,255,0.55)' }}>support@fidge.app</a></Bullet>
    </div>
  );
}
function WarnBox() {
  return (
    <div style={{ background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.3)', borderRadius: '12px', padding: '14px 16px', marginBottom: '22px' }}>
      <p style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '13px', color: 'rgb(255,150,50)', lineHeight: 1.6 }}>⚠ IMPORTANT: FIDGE INVOLVES CRYPTOCURRENCY TRANSACTIONS. ONLY PARTICIPATE WITH FUNDS YOU CAN AFFORD TO LOSE. $PCEDO EARNINGS AND GEM PURCHASES CARRY INHERENT RISK. SEEK PROFESSIONAL FINANCIAL ADVICE IF NECESSARY.</p>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div>
      <LastUpdated date="May 2, 2026" />
      <Section title="1. Introduction">
        Fidge ("we", "us", or "our") operates fidge.app — a gamified Web3 spinner platform where users earn points, gems, and $PCEDO through spinning, referrals, and quests. This Privacy Policy explains how we collect, use, and protect your information when you use our Service.
      </Section>
      <Section title="2. Information We Collect">
        <SubSection title="2.1 Account Information">
          <Bullet><b>Email Address:</b> Used for account registration, OTP verification, and service communications</Bullet>
          <Bullet><b>Username:</b> Your chosen display name on the platform and leaderboard</Bullet>
          <Bullet><b>Password:</b> Stored as a secure bcrypt hash — we never store plaintext passwords</Bullet>
          <Bullet><b>Referral Code:</b> A unique code generated for your account to track referrals</Bullet>
        </SubSection>
        <SubSection title="2.2 Activity Data">
          <Bullet><b>Spinner Activity:</b> Spin sessions, energy usage, and points earned per session</Bullet>
          <Bullet><b>Wheel Spins:</b> Bonus wheel spins and outcomes</Bullet>
          <Bullet><b>Ad Watching:</b> Number of ads watched per batch cycle for energy restoration</Bullet>
          <Bullet><b>Quest Completions:</b> Quest progress and reward history</Bullet>
          <Bullet><b>Skin Ownership:</b> Which skins you own and which is currently active</Bullet>
          <Bullet><b>Points & Gems Balance:</b> Current and historical balance</Bullet>
          <Bullet><b>$PCEDO Earnings & Withdrawals:</b> Earnings history and withdrawal requests with wallet addresses</Bullet>
        </SubSection>
        <SubSection title="2.3 Marketplace & Transactions">
          <Bullet><b>ETH Wallet Address:</b> Collected when you submit a gem purchase request</Bullet>
          <Bullet><b>Transaction Hash:</b> The on-chain transaction ID you provide as proof of payment</Bullet>
          <Bullet><b>Purchase Requests:</b> Gem amounts, ETH amounts, and order status</Bullet>
        </SubSection>
        <SubSection title="2.4 Technical Information">
          <Bullet><b>Device & Browser:</b> Browser type, device type, and operating system for compatibility</Bullet>
          <Bullet><b>IP Address:</b> Collected for security, fraud prevention, and analytics</Bullet>
          <Bullet><b>Local Storage:</b> We store session tokens, energy state, and cooldown timers in your browser's localStorage to preserve your progress across sessions</Bullet>
          <Bullet><b>Authentication Token:</b> A session token stored locally to keep you signed in</Bullet>
        </SubSection>
        <SubSection title="2.5 Referral Information">
          <Bullet><b>Referral Relationships:</b> Which users joined through your referral link</Bullet>
          <Bullet><b>Referral Activity:</b> Whether referred users are active or inactive</Bullet>
        </SubSection>
      </Section>
      <Section title="3. How We Use Your Information">
        <SubSection title="3.1 Service Delivery">
          <Bullet>To create and manage your Fidge account</Bullet>
          <Bullet>To authenticate you via email OTP and session tokens</Bullet>
          <Bullet>To calculate, track, and display points, gems, and $PCEDO balances</Bullet>
          <Bullet>To process gem purchases and $PCEDO withdrawal requests</Bullet>
          <Bullet>To manage your skin collection and active skin preferences</Bullet>
          <Bullet>To administer the referral program and track milestone rewards</Bullet>
          <Bullet>To run the leaderboard and rank users by points or referrals</Bullet>
        </SubSection>
        <SubSection title="3.2 Platform Features">
          <Bullet>To track ad batch cooldowns and energy restoration cycles</Bullet>
          <Bullet>To deliver quest rewards and track quest completion</Bullet>
          <Bullet>To validate and process coupon codes</Bullet>
          <Bullet>To send OTP codes for account registration and login</Bullet>
        </SubSection>
        <SubSection title="3.3 Security & Integrity">
          <Bullet>To detect fraud, bot usage, or manipulation of the points/earning system</Bullet>
          <Bullet>To enforce account bans for policy violations</Bullet>
          <Bullet>To verify gem purchase transactions submitted to the marketplace</Bullet>
        </SubSection>
      </Section>
      <Section title="4. Data Storage & Security">
        Your account data is stored securely on our backend servers hosted on Railway. Passwords are hashed using bcrypt and never stored in plaintext. Session tokens are random and time-limited. ETH wallet addresses submitted for withdrawals are used only to process your request. We use Brevo (formerly Sendinblue) to send transactional emails such as OTP codes. We take reasonable precautions to protect your data but cannot guarantee absolute security.
      </Section>
      <Section title="5. Data Sharing">
        We do not sell your personal information. We may share limited data with:
        <div style={{ marginTop: '8px' }}>
          <Bullet><b>Railway:</b> Backend hosting and database services</Bullet>
          <Bullet><b>Brevo:</b> Transactional email delivery (OTP codes, notifications)</Bullet>
          <Bullet><b>Vercel:</b> Frontend hosting</Bullet>
          <Bullet><b>Ethereum Blockchain:</b> Your ETH wallet address and transaction hash are publicly visible on-chain when you complete a gem purchase</Bullet>
        </div>
        We do not share your email address, username, or points data with third parties for marketing purposes.
      </Section>
      <Section title="6. Leaderboard & Public Data">
        Your username, points total, and referral count are displayed publicly on the Fidge leaderboard. Your email address is never displayed publicly. If you do not wish to appear on the leaderboard, please contact us.
      </Section>
      <Section title="7. Data Retention">
        We retain your account data for as long as your account is active. Withdrawal requests are retained for audit and verification purposes. You may request deletion of your account and associated data by contacting us — note that on-chain transaction data cannot be deleted.
      </Section>
      <Section title="8. Your Rights">
        <Bullet>Access your data through the Profile and leaderboard sections of the app</Bullet>
        <Bullet>Request correction of inaccurate account data</Bullet>
        <Bullet>Request deletion of your account and personal data (excluding on-chain records)</Bullet>
        <Bullet>Withdraw from the platform at any time by stopping use</Bullet>
        <Bullet>Contact us regarding any privacy concern at the details below</Bullet>
      </Section>
      <Section title="9. Cookies & Local Storage">
        Fidge does not use tracking cookies. We use browser localStorage to store your session token, energy state, skin preference, and ad cooldown timers. This data stays on your device and is not shared with third parties. You can clear this data at any time via Settings → Clear Local Data.
      </Section>
      <Section title="10. Children's Privacy">
        Fidge is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has created an account, please contact us immediately.
      </Section>
      <Section title="11. Contact Us">
        For questions, data requests, or privacy concerns, contact us at:
        <ContactBlock />
      </Section>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>By using Fidge at fidge.app, you acknowledge that you have read and understood this Privacy Policy.</p>
    </div>
  );
}

function TermsOfService() {
  return (
    <div>
      <LastUpdated date="May 2, 2026" />
      <Section title="1. Acceptance of Terms">
        By accessing and using Fidge at fidge.app ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. These terms apply to all users including those who register accounts, purchase gems, earn $PCEDO, or simply browse the platform.
      </Section>
      <Section title="2. Description of Service">
        Fidge is a Web3-integrated gamified spinner platform that provides:
        <div style={{ marginTop: '8px' }}>
          <Bullet>An interactive fidget spinner experience that earns points through spinning</Bullet>
          <Bullet>A skin shop where users spend gems to unlock spinner skins with multiplier bonuses</Bullet>
          <Bullet>A gem marketplace where users purchase gems using ETH (Ethereum)</Bullet>
          <Bullet>A $PCEDO earning and withdrawal system for eligible users</Bullet>
          <Bullet>A leaderboard ranking users by points and referrals with prize cycles</Bullet>
          <Bullet>A referral program rewarding users for bringing active new members</Bullet>
          <Bullet>Daily quests, a bonus wheel, and coupon redemption</Bullet>
          <Bullet>An ad-watching system to restore spinner energy in 2-hour batch cycles</Bullet>
        </div>
      </Section>
      <Section title="3. Eligibility">
        You must be at least 18 years old to use this Service. By registering, you confirm that:
        <div style={{ marginTop: '8px' }}>
          <Bullet>You are of legal age in your jurisdiction</Bullet>
          <Bullet>You have the legal capacity to enter into this agreement</Bullet>
          <Bullet>You are not prohibited from using cryptocurrency-related services under applicable laws</Bullet>
          <Bullet>You will comply with all applicable local, national, and international laws</Bullet>
          <Bullet>You are not a resident of a jurisdiction where cryptocurrency activities are prohibited</Bullet>
        </div>
      </Section>
      <Section title="4. Account Registration & Security">
        <Bullet>You must provide a valid email address and create a unique username to register</Bullet>
        <Bullet>Account registration requires OTP verification sent to your email</Bullet>
        <Bullet>You are solely responsible for the security of your account credentials</Bullet>
        <Bullet>You must not share your account with others or allow unauthorized access</Bullet>
        <Bullet>We reserve the right to ban accounts found to be in violation of these terms</Bullet>
        <Bullet>Banned accounts forfeit all accumulated points, gems, and pending withdrawals</Bullet>
      </Section>
      <Section title="5. Points System">
        <Bullet>Points are earned by spinning the fidget spinner — higher-tier skins earn more per energy unit</Bullet>
        <Bullet>Points can be converted to gems via the Profile page</Bullet>
        <Bullet>Points appear on the leaderboard and determine prize cycle eligibility</Bullet>
        <Bullet>Points have no direct monetary value and cannot be exchanged for fiat currency</Bullet>
        <Bullet>Point balances may be adjusted by admin in cases of fraud or manipulation</Bullet>
        <Bullet>Energy resets at midnight and can be restored by watching ads in 2-hour batch cycles</Bullet>
      </Section>
      <Section title="6. Gems & Skin Shop">
        <Bullet>Gems are the in-app currency used to purchase spinner skins</Bullet>
        <Bullet>Gems can be obtained by converting points, purchasing via the marketplace, or redeeming coupons</Bullet>
        <Bullet>Skin purchases are final and non-refundable</Bullet>
        <Bullet>Owned skins remain associated with your account and cannot be transferred</Bullet>
        <Bullet>We reserve the right to add, modify, or remove skins at any time</Bullet>
      </Section>
      <Section title="7. Gem Marketplace & ETH Payments">
        <Bullet>Gem purchases require sending ETH to our designated wallet address</Bullet>
        <Bullet>You must provide a valid transaction hash after sending payment</Bullet>
        <Bullet>All transactions are manually verified by our admin team</Bullet>
        <Bullet>Upon verification, a gem coupon code is issued to your account</Bullet>
        <Bullet>We are not responsible for ETH sent to incorrect addresses</Bullet>
        <Bullet>Gas fees are your responsibility and are non-refundable</Bullet>
        <Bullet>Transactions are final once confirmed on-chain — we cannot reverse blockchain transactions</Bullet>
        <Bullet>Suspected fraudulent transactions will result in account review and possible ban</Bullet>
        <Bullet>Gem values are denominated in USD — ETH amounts are calculated based on market price at time of purchase</Bullet>
      </Section>
      <Section title="8. $PCEDO Earnings & Withdrawals">
        <Bullet>$PCEDO earning is available to eligible users based on platform activity</Bullet>
        <Bullet>Earned $PCEDO can be withdrawn to an ETH-compatible wallet address</Bullet>
        <Bullet>Withdrawals are processed manually and may take time to complete</Bullet>
        <Bullet>Minimum withdrawal amounts may apply</Bullet>
        <Bullet>$PCEDO earnings may be subject to change at our discretion</Bullet>
        <Bullet>We do not guarantee any minimum or consistent earning rate</Bullet>
        <Bullet>Tax obligations arising from $PCEDO earnings are solely your responsibility</Bullet>
      </Section>
      <Section title="9. Referral Program">
        <Bullet>You earn rewards when users you refer join and become active on the platform</Bullet>
        <Bullet>Referral rewards are credited based on activity thresholds met by referred users</Bullet>
        <Bullet>Abuse of the referral system (fake accounts, self-referral) will result in account banning</Bullet>
        <Bullet>Referral rewards may be changed or discontinued at any time</Bullet>
        <Bullet>Milestone gem rewards are credited manually upon admin verification</Bullet>
      </Section>
      <Section title="10. Leaderboard & Prizes">
        <Bullet>Leaderboard rankings are based on total points accumulated during each prize cycle</Bullet>
        <Bullet>Prize cycles have defined start and end dates</Bullet>
        <Bullet>Prizes are distributed at cycle end to top-ranked users</Bullet>
        <Bullet>We reserve the right to disqualify users who manipulate rankings</Bullet>
        <Bullet>Prize details and values are subject to change</Bullet>
        <Bullet>We are not responsible for any tax implications of prizes received</Bullet>
      </Section>
      <Section title="11. Ad Watching">
        <Bullet>Users may watch up to 5 ads per batch to restore spinner energy</Bullet>
        <Bullet>Each batch has a 2-hour cooldown before the next batch becomes available</Bullet>
        <Bullet>Ads are served by third-party ad networks — we do not control ad content</Bullet>
        <Bullet>Ad availability may vary by region and device</Bullet>
        <Bullet>The daily ad limit resets at midnight</Bullet>
      </Section>
      <Section title="12. User Conduct">
        You agree not to:
        <div style={{ marginTop: '8px' }}>
          <Bullet>Use bots, scripts, or automation to spin, earn points, or interact with the Service</Bullet>
          <Bullet>Create multiple accounts to abuse referral rewards or leaderboard rankings</Bullet>
          <Bullet>Attempt to hack, exploit, or manipulate any aspect of the Service</Bullet>
          <Bullet>Submit fraudulent ETH transaction hashes to the marketplace</Bullet>
          <Bullet>Interfere with or disrupt the Service or its servers</Bullet>
          <Bullet>Use the Service in violation of any applicable law</Bullet>
        </div>
      </Section>
      <Section title="13. Intellectual Property">
        <Bullet>All content, design, graphics, and code of Fidge are our property</Bullet>
        <Bullet>Spinner skin artwork and designs are our intellectual property</Bullet>
        <Bullet>You may not reproduce, distribute, or commercialize any part of the Service without permission</Bullet>
        <Bullet>The Fidge name, logo, and brand assets are our exclusive property</Bullet>
      </Section>
      <Section title="14. Termination">
        We reserve the right to suspend or terminate your account at any time for violation of these Terms, suspected fraud, abuse of platform systems, or at our sole discretion. Upon termination, you forfeit all accumulated points, gems, and pending rewards.
      </Section>
      <Section title="15. Modifications to Service">
        We reserve the right to modify, suspend, or discontinue any part of the Service at any time without notice. This includes changes to earning rates, gem prices, skin costs, leaderboard prizes, and platform features.
      </Section>
      <Section title="16. Disclaimers & Limitation of Liability">
        <Bullet>The Service is provided "as is" and "as available" without warranties of any kind</Bullet>
        <Bullet>We do not guarantee uninterrupted, error-free, or secure access to the Service</Bullet>
        <Bullet>We are not liable for any loss of points, gems, or $PCEDO due to technical issues</Bullet>
        <Bullet>We are not liable for failed ETH transactions, network congestion, or wallet issues</Bullet>
        <Bullet>To the maximum extent permitted by law, our total liability shall not exceed $100 USD</Bullet>
      </Section>
      <Section title="17. Governing Law">
        These Terms shall be governed by applicable law. Any disputes shall be resolved through good-faith negotiation before resorting to any formal legal process.
      </Section>
      <Section title="18. Contact Information">
        For questions about these Terms, contact us at:
        <ContactBlock />
      </Section>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>By using Fidge, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
    </div>
  );
}

function Disclaimer() {
  return (
    <div>
      <WarnBox />
      <LastUpdated date="May 2, 2026" />
      <Section title="1. General Disclaimer">
        Fidge (fidge.app) is provided on an "as is" and "as available" basis. We make no representations or warranties of any kind, express or implied, regarding the operation, availability, accuracy, or reliability of the Service. Your use of the platform is entirely at your own risk.
      </Section>
      <Section title="2. No Financial Advice">
        Nothing on Fidge constitutes financial, investment, legal, or tax advice. The availability of $PCEDO earnings, gem purchases, or leaderboard prizes does not represent a solicitation to invest. All participation is for entertainment and engagement purposes. Always do your own research and consult a qualified financial advisor before making any cryptocurrency-related decisions.
      </Section>
      <Section title="3. Cryptocurrency & ETH Payment Risks">
        <Bullet>ETH prices are highly volatile and may change significantly between initiation and confirmation of a payment</Bullet>
        <Bullet>Once ETH is sent on-chain, it cannot be reversed — verify all wallet addresses carefully</Bullet>
        <Bullet>Network congestion may delay transaction confirmation</Bullet>
        <Bullet>Gas fees are non-refundable regardless of transaction outcome</Bullet>
        <Bullet>We are not responsible for ETH lost due to user error, incorrect addresses, or failed transactions</Bullet>
        <Bullet>Cryptocurrency may be subject to regulatory restrictions in your jurisdiction</Bullet>
      </Section>
      <Section title="4. $PCEDO Earning Risks">
        <Bullet>$PCEDO is an in-app token — its value, if any, is not guaranteed</Bullet>
        <Bullet>Earning rates may be adjusted or discontinued at any time without notice</Bullet>
        <Bullet>Withdrawal processing times are not guaranteed</Bullet>
        <Bullet>We make no representation about the future value or tradability of $PCEDO</Bullet>
        <Bullet>$PCEDO earnings may be taxable in your jurisdiction — consult a tax professional</Bullet>
        <Bullet>Daily earning limits apply and are subject to change</Bullet>
      </Section>
      <Section title="5. Gem Marketplace Disclaimer">
        <Bullet>Gem purchases via ETH are final once submitted — we cannot issue refunds for on-chain transactions</Bullet>
        <Bullet>Gem values are pegged to USD but paid in ETH at market rate — you bear ETH price fluctuation risk</Bullet>
        <Bullet>Manual verification may take time — coupon codes are not instant</Bullet>
        <Bullet>We reserve the right to reject any transaction deemed fraudulent or suspicious</Bullet>
        <Bullet>Gem balances have no monetary value outside the Fidge platform</Bullet>
      </Section>
      <Section title="6. Points, Leaderboard & Prize Disclaimer">
        <Bullet>Points have no monetary value and are not redeemable for cash</Bullet>
        <Bullet>Leaderboard prizes are subject to change and are at our sole discretion</Bullet>
        <Bullet>We reserve the right to disqualify any user from prize cycles for suspected manipulation</Bullet>
        <Bullet>Prize distributions may be delayed or modified without prior notice</Bullet>
        <Bullet>Prize winners are responsible for all applicable taxes on rewards received</Bullet>
      </Section>
      <Section title="7. Service Availability">
        <Bullet>We do not guarantee continuous or uninterrupted access to Fidge</Bullet>
        <Bullet>The platform may be unavailable due to maintenance, server issues, or unexpected downtime</Bullet>
        <Bullet>Points, energy, or progress may occasionally fail to sync due to technical errors</Bullet>
        <Bullet>We may modify, pause, or discontinue any feature of the Service at any time</Bullet>
        <Bullet>We are not liable for any losses arising from Service unavailability</Bullet>
      </Section>
      <Section title="8. Third-Party Wallets & Services">
        <Bullet>We are not affiliated with MetaMask, Trust Wallet, Binance Web3, Farcaster/Warpcast, or any other wallet provider</Bullet>
        <Bullet>We are not responsible for failures, bugs, or security issues in third-party wallet applications</Bullet>
        <Bullet>Ad content is served by third-party ad networks — we do not endorse or control ad content</Bullet>
        <Bullet>Email delivery is handled by Brevo — we are not responsible for email delivery failures</Bullet>
        <Bullet>We use Railway and Vercel for hosting — we are not liable for outages on their platforms</Bullet>
      </Section>
      <Section title="9. User Responsibility">
        <Bullet>You are solely responsible for the security of your Fidge account credentials</Bullet>
        <Bullet>You are responsible for verifying all ETH wallet addresses before sending transactions</Bullet>
        <Bullet>You are responsible for any tax obligations arising from platform activity</Bullet>
        <Bullet>We will never ask for your private keys or seed phrases</Bullet>
        <Bullet>Be cautious of phishing sites — always access Fidge only at fidge.app</Bullet>
        <Bullet>Only participate with funds and time you can afford to commit</Bullet>
      </Section>
      <Section title="10. Limitation of Liability">
        <Bullet>We are not liable for any financial losses related to cryptocurrency transactions</Bullet>
        <Bullet>We are not liable for loss of points, gems, or $PCEDO due to technical failures</Bullet>
        <Bullet>We are not liable for indirect, incidental, special, consequential, or punitive damages</Bullet>
        <Bullet>In no event shall our total liability to you exceed $100 USD</Bullet>
        <Bullet>These limitations apply to the fullest extent permitted by applicable law</Bullet>
      </Section>
      <Section title="11. Contact Information">
        For questions about this Disclaimer, contact us at:
        <ContactBlock />
      </Section>
      <WarnBox />
    </div>
  );
}

export default function LegalModal({
  modal: modalProp,
  setModal,
  type,
  onClose,
}: {
  modal?: ModalType;
  setModal?: (m: ModalType) => void;
  type?: ModalType;
  onClose?: () => void;
}) {
  const modal = modalProp ?? type ?? null;
  const closeModal = () => { setModal?.(null); onClose?.(); };
  const [cleared, setCleared] = useState(false);
  const clearData = () => { localStorage.clear(); setCleared(true); setTimeout(() => setCleared(false), 2000); };

  if (!modal) return null;

  return (
    <div onClick={() => closeModal()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: 'calc(88vh - 80px)', marginBottom: '80px', background: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '15px', color: 'white', letterSpacing: '1px' }}>
            {modal === 'privacy'    && 'Privacy Policy'}
            {modal === 'terms'      && 'Terms of Service'}
            {modal === 'disclaimer' && 'Disclaimer'}
            {modal === 'settings'   && 'Settings'}
          </span>
          <button onClick={() => closeModal()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '20px', cursor: 'pointer', padding: '4px', WebkitTapHighlightColor: 'transparent' as any }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
          {modal === 'privacy'    && <PrivacyPolicy />}
          {modal === 'terms'      && <TermsOfService />}
          {modal === 'disclaimer' && <Disclaimer />}
          {modal === 'settings'   && (
            <div>
              <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '16px' }}>STORAGE & DATA</p>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(255,60,60,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>🗑</div>
                  <div>
                    <p style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '16px', color: 'white', marginBottom: '4px' }}>Clear Local Data</p>
                    <p style={{ fontFamily: 'Rajdhani', fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Fix syncing issues by clearing local storage. This will NOT delete your server-side progress (points, gems, skins), but will reset your local session and cooldown timers.</p>
                  </div>
                </div>
                <button onClick={clearData} style={{ padding: '12px 20px', background: cleared ? 'rgba(0,200,100,0.15)' : 'rgba(255,60,60,0.15)', border: `1px solid ${cleared ? 'rgba(0,200,100,0.3)' : 'rgba(255,60,60,0.3)'}`, borderRadius: '10px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '14px', color: cleared ? 'rgb(0,200,100)' : 'rgb(255,100,100)', WebkitTapHighlightColor: 'transparent' as any }}>
                  {cleared ? '✓ Cleared' : 'Clear Data'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
