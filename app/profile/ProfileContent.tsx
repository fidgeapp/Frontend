'use client';
import { useAuth } from '@/context/AuthContext';

interface Quest {
  id:            number;
  title:         string;
  description:   string;
  reward_points: number;
  pivot?:        { completed: boolean };
  completed?:    boolean;
}

function QuestCard({ quest }: { quest: Quest }) {
  const done = quest.pivot?.completed ?? quest.completed ?? false;
  return (
    <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', opacity: done ? 1 : 0.65 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: done ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', border: done ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
          {done ? '✓' : '○'}
        </div>
        <div>
          <p style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '15px', color: 'white' }}>{quest.title}</p>
          <p style={{ fontFamily: 'Rajdhani', fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{quest.description}</p>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '13px', color: done ? 'white' : 'rgba(255,255,255,0.3)' }}>+{quest.reward_points}</p>
        <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px' }}>PTS</p>
      </div>
    </div>
  );
}

export default function ProfileContent({ quests }: { quests: Quest[] }) {
  const { loggedIn, points } = useAuth();

  if (!loggedIn) return null;

  const completed = quests.filter(q => q.pivot?.completed ?? q.completed).length;
  const total     = quests.length;

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Quest progress header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '3px', height: '18px', background: 'white', borderRadius: '2px' }}/>
          <p style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '13px', color: 'white', letterSpacing: '1px' }}>QUESTS</p>
        </div>
        <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
          {completed}/{total} done
        </p>
      </div>

      {total === 0 ? (
        <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '24px' }}>
          Loading quests...
        </p>
      ) : (
        quests.map(q => <QuestCard key={q.id} quest={q} />)
      )}
    </div>
  );
}
