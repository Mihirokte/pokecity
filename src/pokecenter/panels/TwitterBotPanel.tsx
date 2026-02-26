import { useState } from 'react';
import { usePokecenterStore } from '../pokecenterStore';
import { C, pf } from '../gba-theme';
import { PanelShell, SectionTitle, ProgressBar, StatusDot } from './PanelShell';

interface Props {
  onClose: () => void;
}

export function TwitterBotPanel({ onClose }: Props) {
  const twitterPosts = usePokecenterStore(s => s.twitterPosts);
  const addTwitterPost = usePokecenterStore(s => s.addTwitterPost);
  const agents = usePokecenterStore(s => s.agents);
  const [showDraft, setShowDraft] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [draftSchedule, setDraftSchedule] = useState('');

  const agent = agents.find(a => a.id === 'agent_twitter');
  const scheduled = twitterPosts.filter(p => p.status === 'scheduled');
  const drafts = twitterPosts.filter(p => p.status === 'draft');
  const posted = twitterPosts.filter(p => p.status === 'posted');

  const totalLikes = posted.reduce((s, p) => s + (parseInt(p.engagementLikes) || 0), 0);
  const totalRetweets = posted.reduce((s, p) => s + (parseInt(p.engagementRetweets) || 0), 0);
  const totalReplies = posted.reduce((s, p) => s + (parseInt(p.engagementReplies) || 0), 0);
  const engagementRate = posted.length > 0 ? ((totalLikes + totalRetweets + totalReplies) / posted.length / 100 * 4.2).toFixed(1) : '0';

  const saveDraft = () => {
    if (!draftContent.trim()) return;
    addTwitterPost(draftContent.trim(), draftSchedule ? 'scheduled' : 'draft', draftSchedule);
    setDraftContent('');
    setDraftSchedule('');
    setShowDraft(false);
  };

  return (
    <PanelShell title="🐦 TWITTER BOT — CHATOT" onClose={onClose}>
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 48, height: 48,
          background: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/441.png) center/contain no-repeat`,
          imageRendering: 'pixelated',
          border: `2px solid ${C.panelBorder}`,
          flexShrink: 0,
        }} />
        <div>
          <div style={{ ...pf(8), display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ color: C.textLight }}>STATUS:</span>
            <StatusDot status={agent?.status || 'idle'} />
            <span style={{ color: C.textLight }}>{(agent?.status || 'idle').toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Post Queue */}
      <SectionTitle>── POST QUEUE ──</SectionTitle>
      {scheduled.length === 0 && drafts.length === 0 ? (
        <div style={{ ...pf(7), color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>No posts in queue.</div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {scheduled.map((post, i) => (
            <div key={post.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.1)`, padding: '6px 0' }}>
              <div style={{ ...pf(7), color: C.statusYellow, marginBottom: 2 }}>
                #{i + 1} [SCHEDULED {post.scheduledAt || 'TBD'}]
              </div>
              <div style={{ ...pf(7), color: 'rgba(255,255,255,0.7)' }}>
                "{post.content.slice(0, 60)}{post.content.length > 60 ? '...' : ''}"
              </div>
            </div>
          ))}
          {drafts.map((post, i) => (
            <div key={post.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.1)`, padding: '6px 0' }}>
              <div style={{ ...pf(7), color: C.panelBorderDim, marginBottom: 2 }}>
                #{scheduled.length + i + 1} [DRAFT]
              </div>
              <div style={{ ...pf(7), color: 'rgba(255,255,255,0.5)' }}>
                "{post.content.slice(0, 60)}{post.content.length > 60 ? '...' : ''}"
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Posts */}
      <SectionTitle>── RECENT POSTS ──</SectionTitle>
      {posted.length === 0 ? (
        <div style={{ ...pf(7), color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>No posts yet.</div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {posted.slice(-3).reverse().map(post => (
            <div key={post.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.1)`, padding: '6px 0' }}>
              <div style={{ ...pf(7), color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>
                "{post.content.slice(0, 50)}{post.content.length > 50 ? '...' : ''}"
              </div>
              <div style={{ ...pf(6), color: 'rgba(255,255,255,0.5)' }}>
                ♥ {post.engagementLikes} ↻ {post.engagementRetweets} 💬 {post.engagementReplies}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics */}
      <SectionTitle>── ANALYTICS (7 DAYS) ──</SectionTitle>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ ...pf(7), color: C.textLight, width: 90 }}>Engagement:</span>
          <div style={{ flex: 1 }}><ProgressBar value={parseFloat(engagementRate) * 10} color={C.statusGreen} height={8} /></div>
          <span style={{ ...pf(7), color: C.textLight }}>{engagementRate}%</span>
        </div>
        <div style={{ ...pf(7), color: 'rgba(255,255,255,0.6)' }}>
          Total: ♥ {totalLikes} ↻ {totalRetweets} 💬 {totalReplies}
        </div>
      </div>

      {/* Draft form */}
      {showDraft ? (
        <div style={{ border: `2px solid ${C.panelBorder}`, padding: 10, background: '#081418' }}>
          <SectionTitle>── DRAFT NEW POST ──</SectionTitle>
          <textarea
            className="gba-textarea"
            rows={4}
            value={draftContent}
            onChange={e => setDraftContent(e.target.value)}
            placeholder="What's on your mind, Trainer?"
            autoFocus
          />
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <div style={{ ...pf(7), color: C.textLight, marginBottom: 4 }}>Schedule (optional):</div>
            <input className="gba-input" type="time" value={draftSchedule} onChange={e => setDraftSchedule(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="gba-btn" onClick={saveDraft}>✓ SAVE</button>
            <button className="gba-btn" onClick={() => setShowDraft(false)}>✕ CANCEL</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="gba-btn" onClick={() => setShowDraft(true)}>DRAFT NEW</button>
        </div>
      )}
    </PanelShell>
  );
}
