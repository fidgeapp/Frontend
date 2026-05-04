'use client';
export const dynamic = 'force-dynamic';

export default function ComingSoonPage() {
  return (
    <main style={{
      minHeight: '100dvh', background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes glow  { 0%,100%{box-shadow:0 0 30px rgba(96,165,250,0.2)} 50%{box-shadow:0 0 60px rgba(96,165,250,0.5)} }
      `}</style>

      {/* Background glow */}
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse 120% 60% at 50% 50%, rgba(96,165,250,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div className="dot-bg" style={{ position:'absolute', inset:0, opacity:0.15, pointerEvents:'none' }} />

      {/* Logo */}
      <div style={{ marginBottom:32, animation:'float 4s ease-in-out infinite' }}>
        <img src="/logo.png" alt="Fidge" style={{ height:64 }} />
      </div>

      {/* Card */}
      <div style={{
        position:'relative', zIndex:1,
        background:'rgba(255,255,255,0.03)',
        border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:24, padding:'40px 32px',
        maxWidth:420, width:'100%', textAlign:'center',
        animation:'glow 3s ease-in-out infinite',
      }}>
        {/* Badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.25)', borderRadius:999, marginBottom:24 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#60a5fa', animation:'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'#60a5fa', letterSpacing:2 }}>COMING SOON</span>
        </div>

        <h1 style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:28, color:'#fff', letterSpacing:2, marginBottom:16, lineHeight:1.2 }}>
          🚀 Feature Dropping Soon
        </h1>

        <p style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, color:'rgba(255,255,255,0.45)', lineHeight:1.7, marginBottom:32 }}>
          We're putting the finishing touches on this feature. 
          Stay tuned — Fidge is going fully live very soon.
        </p>

        {/* Divider */}
        <div style={{ width:'100%', height:1, background:'rgba(255,255,255,0.07)', marginBottom:28 }} />

        {/* What's coming */}
        <p style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'rgba(255,255,255,0.25)', letterSpacing:2, marginBottom:16 }}>WHAT'S COMING</p>
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:32 }}>
          {[
            ['💎', 'Gem Marketplace', 'Buy gems with ETH — multiple packages'],
            ['🔄', 'Auto Spin', 'Let the spinner run on its own'],
            ['🌐', 'Open Signups', 'Anyone can join Fidge'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, textAlign:'left' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{icon}</span>
              <div>
                <p style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:14, color:'rgba(255,255,255,0.7)', marginBottom:2 }}>{title}</p>
                <p style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'rgba(255,255,255,0.3)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Community link */}
        <a
          href="https://linktr.ee/cedomisofficial"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:12, textDecoration:'none', fontFamily:'Orbitron,sans-serif', fontWeight:700, fontSize:12, color:'white', letterSpacing:1 }}
        >
          JOIN OUR COMMUNITY →
        </a>
      </div>

      <p style={{ marginTop:24, fontFamily:'Space Mono,monospace', fontSize:10, color:'rgba(255,255,255,0.2)' }}>
        fidge.app · @FIDGE_APP
      </p>
    </main>
  );
}
