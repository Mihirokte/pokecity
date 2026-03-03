import { usePokecenterStore } from '../pokecenterStore';
import { PageHeader } from '../components/PageHeader';

export function KnowledgeBase() {
  const knowledgeEntries = usePokecenterStore(s => s.knowledgeEntries);
  const agents = usePokecenterStore(s => s.agents);

  return (
    <>
      <PageHeader
        title="Knowledge Base"
        description={`${knowledgeEntries.length} entries collected by agents`}
      />

      {knowledgeEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">&#x1F4DA;</div>
          <div className="empty-state__text">No knowledge entries yet</div>
          <div className="empty-state__sub">Agents will populate this as they fetch and index data</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {knowledgeEntries.map(entry => {
            const agent = agents.find(a => a.id === entry.agentId);
            return (
              <div key={entry.id} className="card card--interactive">
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {entry.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {entry.source} {agent && `\u2022 ${agent.name}`}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {entry.contentSummary}
                </div>
                {entry.fetchedAt && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Fetched: {new Date(entry.fetchedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
