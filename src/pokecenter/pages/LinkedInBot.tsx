import { useState } from 'react';
import { usePokecenterStore } from '../pokecenterStore';
import { PageHeader } from '../components/PageHeader';

export function LinkedInBot() {
  const linkedInPosts = usePokecenterStore(s => s.linkedInPosts);
  const addLinkedInPost = usePokecenterStore(s => s.addLinkedInPost);
  const updateLinkedInPost = usePokecenterStore(s => s.updateLinkedInPost);

  const [content, setContent] = useState('');
  const [tab, setTab] = useState<'all' | 'draft' | 'scheduled' | 'posted'>('all');

  const filtered = linkedInPosts.filter(p => tab === 'all' || p.status === tab);
  const posted = linkedInPosts.filter(p => p.status === 'posted');
  const totalLikes = posted.reduce((sum, p) => sum + (parseInt(p.engagementLikes) || 0), 0);
  const totalShares = posted.reduce((sum, p) => sum + (parseInt(p.engagementShares) || 0), 0);

  const handlePost = () => {
    if (!content.trim()) return;
    addLinkedInPost(content.trim(), 'draft', '');
    setContent('');
  };

  return (
    <>
      <PageHeader
        title="LinkedIn Bot"
        description="Manage your LinkedIn content and engagement"
      />

      <div className="stat-row" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card__value">{linkedInPosts.length}</div>
          <div className="stat-card__label">Total Posts</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{posted.length}</div>
          <div className="stat-card__label">Published</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{totalLikes}</div>
          <div className="stat-card__label">Total Likes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{totalShares}</div>
          <div className="stat-card__label">Total Shares</div>
        </div>
      </div>

      <div className="compose">
        <textarea
          className="compose__textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Share a professional update..."
        />
        <div className="compose__actions">
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{content.length} chars</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--secondary" onClick={() => { if (content.trim()) { addLinkedInPost(content.trim(), 'scheduled', ''); setContent(''); } }}>
              Schedule
            </button>
            <button className="btn btn--primary" onClick={handlePost}>
              Save Draft
            </button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {(['all', 'draft', 'scheduled', 'posted'] as const).map(t => (
          <button key={t} className={`tab ${tab === t ? 'tab--active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({linkedInPosts.filter(p => t === 'all' || p.status === t).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">&#x1F4BC;</div>
          <div className="empty-state__text">No posts yet</div>
          <div className="empty-state__sub">Compose a post to get started</div>
        </div>
      ) : (
        filtered.map(post => (
          <div key={post.id} className="post-card">
            <div className="post-card__content">{post.content}</div>
            <div className="post-card__meta">
              <span className={`priority-badge priority-badge--${post.status === 'posted' ? 'normal' : post.status === 'scheduled' ? 'high' : 'low'}`}>
                {post.status}
              </span>
              {post.status === 'posted' && (
                <>
                  <span className="post-card__stat">&#x1F44D; {post.engagementLikes}</span>
                  <span className="post-card__stat">&#x1F4AC; {post.engagementComments}</span>
                  <span className="post-card__stat">&#x1F501; {post.engagementShares}</span>
                </>
              )}
              {post.status === 'draft' && (
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => updateLinkedInPost(post.id, { status: 'scheduled' })}
                >
                  Schedule
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}
