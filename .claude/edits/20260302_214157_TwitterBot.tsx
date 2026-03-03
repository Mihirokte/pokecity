import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { usePokecenterStore } from '../pokecenterStore';
import { PageHeader } from '../components/PageHeader';
import type { CuratedTweet, TwitterConfig } from '../../types';

type MainTab = 'feed' | 'compose' | 'config';
type ComposeTab = 'all' | 'draft' | 'scheduled' | 'posted';

const DEFAULT_CONFIG: TwitterConfig = {
  accounts: [],
  keywords: [],
  maxPerAccount: 20,
  minLikes: 50,
};

function parseConfig(json: string): TwitterConfig {
  try {
    const parsed = JSON.parse(json);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function TwitterBot() {
  const twitterPosts = usePokecenterStore(s => s.twitterPosts);
  const addTwitterPost = usePokecenterStore(s => s.addTwitterPost);
  const updateTwitterPost = usePokecenterStore(s => s.updateTwitterPost);
  const curatedTweets = usePokecenterStore(s => s.curatedTweets);
  const importCuratedTweets = usePokecenterStore(s => s.importCuratedTweets);
  const updateCuratedTweet = usePokecenterStore(s => s.updateCuratedTweet);
  const deleteCuratedTweet = usePokecenterStore(s => s.deleteCuratedTweet);
  const agents = usePokecenterStore(s => s.agents);
  const updateAgentConfig = usePokecenterStore(s => s.updateAgentConfig);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState('');
  const [mainTab, setMainTab] = useState<MainTab>('feed');
  const [composeTab, setComposeTab] = useState<ComposeTab>('all');
  const [content, setContent] = useState('');

  // Feed filters
  const [search, setSearch] = useState('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStarred, setFilterStarred] = useState(false);

  // Config state
  const agent = agents.find(a => a.id === 'agent_twitter');
  const config = parseConfig(agent?.configJson || '{}');
  const [cfgAccounts, setCfgAccounts] = useState(config.accounts.join(', '));
  const [cfgKeywords, setCfgKeywords] = useState(config.keywords.join(', '));
  const [cfgMaxPerAccount, setCfgMaxPerAccount] = useState(String(config.maxPerAccount));
  const [cfgMinLikes, setCfgMinLikes] = useState(String(config.minLikes));

  // Editing state for inline tweet edits
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // ── Feed filtering + stats ──
  const uniqueAuthors = useMemo(() =>
    [...new Set(curatedTweets.map(t => t.authorHandle))].sort(),
    [curatedTweets]
  );
  const uniqueCategories = useMemo(() =>
    [...new Set(curatedTweets.map(t => t.category).filter(Boolean))].sort(),
    [curatedTweets]
  );

  const filtered = useMemo(() => {
    return curatedTweets.filter(t => {
      if (search && !t.content.toLowerCase().includes(search.toLowerCase()) &&
          !t.author.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterAuthor && t.authorHandle !== filterAuthor) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterStarred && t.starred !== 'true') return false;
      return true;
    }).sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
  }, [curatedTweets, search, filterAuthor, filterCategory, filterStarred]);

  const starredCount = curatedTweets.filter(t => t.starred === 'true').length;

  // ── Feed actions ──
  const toggleStar = (tweet: CuratedTweet) => {
    updateCuratedTweet(tweet.id, { starred: tweet.starred === 'true' ? 'false' : 'true' });
  };

  const startEdit = (tweet: CuratedTweet) => {
    setEditingId(tweet.id);
    setEditTags(tweet.tags);
    setEditCategory(tweet.category);
    setEditNotes(tweet.notes);
  };

  const saveEdit = (id: string) => {
    updateCuratedTweet(id, { tags: editTags, category: editCategory, notes: editNotes });
    setEditingId(null);
  };

  const useAsTemplate = (tweet: CuratedTweet) => {
    setContent(tweet.content);
    setMainTab('compose');
  };

  // ── Import handler ──
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('Importing...');
      const text = await file.text();
      const tweets: CuratedTweet[] = JSON.parse(text);
      if (!Array.isArray(tweets)) throw new Error('Expected an array');
      const count = await importCuratedTweets(tweets);
      setImportStatus(count > 0 ? `Imported ${count} new tweets!` : 'No new tweets to import (all duplicates).');
    } catch (err) {
      setImportStatus(`Import failed: ${err instanceof Error ? err.message : 'Invalid file'}`);
    }
    // Reset file input so same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setImportStatus(''), 5000);
  };

  // ── Compose handlers ──
  const composeFiltered = twitterPosts.filter(p => composeTab === 'all' || p.status === composeTab);
  const posted = twitterPosts.filter(p => p.status === 'posted');
  const totalLikes = posted.reduce((sum, p) => sum + (parseInt(p.engagementLikes) || 0), 0);
  const totalRT = posted.reduce((sum, p) => sum + (parseInt(p.engagementRetweets) || 0), 0);

  const handlePost = () => {
    if (!content.trim()) return;
    addTwitterPost(content.trim(), 'draft', '');
    setContent('');
  };

  // ── Config save ──
  const saveConfig = () => {
    const newConfig: TwitterConfig = {
      accounts: cfgAccounts.split(',').map(s => s.trim()).filter(Boolean),
      keywords: cfgKeywords.split(',').map(s => s.trim()).filter(Boolean),
      maxPerAccount: parseInt(cfgMaxPerAccount) || 20,
      minLikes: parseInt(cfgMinLikes) || 0,
    };
    updateAgentConfig('agent_twitter', JSON.stringify(newConfig));
  };

  const formatNum = (n: string) => {
    const num = parseInt(n) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
  };

  return (
    <>
      <PageHeader
        title="Twitter Bot"
        description="Curate tweets, compose posts, and configure scraping"
      />

      {/* Main tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {(['feed', 'compose', 'config'] as const).map(t => (
          <button
            key={t}
            className={`tab ${mainTab === t ? 'tab--active' : ''}`}
            onClick={() => setMainTab(t)}
          >
            {t === 'feed' ? `Feed (${curatedTweets.length})` :
             t === 'compose' ? `Compose (${twitterPosts.length})` :
             'Config'}
          </button>
        ))}
      </div>

      {/* ═══════ FEED TAB ═══════ */}
      {mainTab === 'feed' && (
        <>
          {/* Stats + Import */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
            <div className="stat-row" style={{ flex: 1, marginBottom: 0 }}>
              <div className="stat-card">
                <div className="stat-card__value">{curatedTweets.length}</div>
                <div className="stat-card__label">Collected</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__value">{starredCount}</div>
                <div className="stat-card__label">Starred</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__value">{uniqueAuthors.length}</div>
                <div className="stat-card__label">Authors</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn--primary"
                onClick={() => fileInputRef.current?.click()}
              >
                Import from scraper
              </button>
              {importStatus && (
                <span style={{ fontSize: 12, color: importStatus.includes('failed') ? 'var(--red)' : 'var(--green)' }}>
                  {importStatus}
                </span>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="tweet-filters">
            <input
              className="tweet-filters__search"
              type="text"
              placeholder="Search tweets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="tweet-filters__select"
              value={filterAuthor}
              onChange={e => setFilterAuthor(e.target.value)}
            >
              <option value="">All authors</option>
              {uniqueAuthors.map(a => <option key={a} value={a}>@{a}</option>)}
            </select>
            <select
              className="tweet-filters__select"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              className={`btn btn--sm ${filterStarred ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setFilterStarred(!filterStarred)}
            >
              {filterStarred ? '★ Starred' : '☆ Starred'}
            </button>
          </div>

          {/* Tweet cards */}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">&#x1F426;</div>
              <div className="empty-state__text">No curated tweets yet</div>
              <div className="empty-state__sub">Run the scraper to collect tweets, or configure accounts in the Config tab</div>
            </div>
          ) : (
            <div className="tweet-feed">
              {filtered.map(tweet => (
                <div key={tweet.id} className={`tweet-card ${tweet.starred === 'true' ? 'tweet-card--starred' : ''}`}>
                  <div className="tweet-card__header">
                    <div className="tweet-card__author">
                      <span className="tweet-card__name">{tweet.author}</span>
                      <span className="tweet-card__handle">@{tweet.authorHandle}</span>
                    </div>
                    <div className="tweet-card__actions-top">
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => toggleStar(tweet)}
                        title={tweet.starred === 'true' ? 'Unstar' : 'Star'}
                      >
                        {tweet.starred === 'true' ? '★' : '☆'}
                      </button>
                    </div>
                  </div>

                  <div className="tweet-card__content">{tweet.content}</div>

                  <div className="tweet-card__stats">
                    <span>&#x2764; {formatNum(tweet.likes)}</span>
                    <span>&#x1F501; {formatNum(tweet.retweets)}</span>
                    <span>&#x1F4AC; {formatNum(tweet.replies)}</span>
                    <span className="tweet-card__date">
                      {new Date(tweet.collectedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {tweet.tags && (
                    <div className="tweet-card__tags">
                      {tweet.tags.split(',').map(tag => (
                        <span key={tag.trim()} className="tweet-card__tag">{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                  {tweet.category && (
                    <span className="priority-badge priority-badge--normal">{tweet.category}</span>
                  )}

                  {/* Inline edit panel */}
                  {editingId === tweet.id ? (
                    <div className="tweet-card__edit">
                      <input
                        type="text"
                        placeholder="Tags (comma-separated)"
                        value={editTags}
                        onChange={e => setEditTags(e.target.value)}
                        className="tweet-card__edit-input"
                      />
                      <input
                        type="text"
                        placeholder="Category"
                        value={editCategory}
                        onChange={e => setEditCategory(e.target.value)}
                        className="tweet-card__edit-input"
                      />
                      <textarea
                        placeholder="Notes / inspiration ideas"
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        className="tweet-card__edit-input"
                        rows={2}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn--primary btn--sm" onClick={() => saveEdit(tweet.id)}>Save</button>
                        <button className="btn btn--secondary btn--sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    tweet.notes && <div className="tweet-card__notes">{tweet.notes}</div>
                  )}

                  <div className="tweet-card__actions">
                    <button className="btn btn--ghost btn--sm" onClick={() => startEdit(tweet)}>
                      Edit
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => useAsTemplate(tweet)}>
                      Use as template
                    </button>
                    {tweet.tweetUrl && (
                      <a
                        className="btn btn--ghost btn--sm"
                        href={tweet.tweetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open on X
                      </a>
                    )}
                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ color: 'var(--red)' }}
                      onClick={() => deleteCuratedTweet(tweet.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════ COMPOSE TAB ═══════ */}
      {mainTab === 'compose' && (
        <>
          <div className="stat-row" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-card__value">{twitterPosts.length}</div>
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
              <div className="stat-card__value">{totalRT}</div>
              <div className="stat-card__label">Total Retweets</div>
            </div>
          </div>

          <div className="compose">
            <textarea
              className="compose__textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={280}
            />
            <div className="compose__actions">
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{content.length}/280</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn--secondary" onClick={() => { if (content.trim()) { addTwitterPost(content.trim(), 'scheduled', ''); setContent(''); } }}>
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
              <button key={t} className={`tab ${composeTab === t ? 'tab--active' : ''}`} onClick={() => setComposeTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)} ({twitterPosts.filter(p => t === 'all' || p.status === t).length})
              </button>
            ))}
          </div>

          {composeFiltered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">&#x1F426;</div>
              <div className="empty-state__text">No posts yet</div>
              <div className="empty-state__sub">Compose a tweet to get started</div>
            </div>
          ) : (
            composeFiltered.map(post => (
              <div key={post.id} className="post-card">
                <div className="post-card__content">{post.content}</div>
                <div className="post-card__meta">
                  <span className={`priority-badge priority-badge--${post.status === 'posted' ? 'normal' : post.status === 'scheduled' ? 'high' : 'low'}`}>
                    {post.status}
                  </span>
                  {post.status === 'posted' && (
                    <>
                      <span className="post-card__stat">&#x2764; {post.engagementLikes}</span>
                      <span className="post-card__stat">&#x1F501; {post.engagementRetweets}</span>
                      <span className="post-card__stat">&#x1F4AC; {post.engagementReplies}</span>
                    </>
                  )}
                  {post.status === 'draft' && (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => updateTwitterPost(post.id, { status: 'scheduled' })}
                    >
                      Schedule
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ═══════ CONFIG TAB ═══════ */}
      {mainTab === 'config' && (
        <div className="card" style={{ padding: 24 }}>
          <div className="section__title" style={{ marginBottom: 16 }}>Scraper Configuration</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Configure which Twitter accounts and keywords the Python scraper will monitor.
            Run <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>python scraper.py scrape</code> to collect tweets.
          </p>

          <div className="config-form">
            <label className="config-form__label">
              Accounts to follow
              <input
                type="text"
                className="config-form__input"
                placeholder="naval, paulg, elonmusk"
                value={cfgAccounts}
                onChange={e => setCfgAccounts(e.target.value)}
              />
              <span className="config-form__hint">Comma-separated Twitter handles (without @)</span>
            </label>

            <label className="config-form__label">
              Keywords to search
              <input
                type="text"
                className="config-form__input"
                placeholder="startup advice, productivity tip"
                value={cfgKeywords}
                onChange={e => setCfgKeywords(e.target.value)}
              />
              <span className="config-form__hint">Comma-separated search terms</span>
            </label>

            <div style={{ display: 'flex', gap: 16 }}>
              <label className="config-form__label" style={{ flex: 1 }}>
                Max tweets per account
                <input
                  type="number"
                  className="config-form__input"
                  value={cfgMaxPerAccount}
                  onChange={e => setCfgMaxPerAccount(e.target.value)}
                  min={1}
                  max={100}
                />
              </label>

              <label className="config-form__label" style={{ flex: 1 }}>
                Min likes threshold
                <input
                  type="number"
                  className="config-form__input"
                  value={cfgMinLikes}
                  onChange={e => setCfgMinLikes(e.target.value)}
                  min={0}
                />
              </label>
            </div>

            <button className="btn btn--primary" onClick={saveConfig} style={{ marginTop: 16 }}>
              Save Configuration
            </button>
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
            <div className="section__title" style={{ marginBottom: 8 }}>Current Config</div>
            <pre style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
