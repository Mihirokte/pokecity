import { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';

type GameState = 'topic-selection' | 'playing' | 'result';

interface GameData {
  statements: string[];
  correctAnswer: number;
  explanation: string;
}

export function HallucinationGame() {
  const [gameState, setGameState] = useState<GameState>('topic-selection');
  const [topics, setTopics] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { generateTopics(); }, []);

  const generateTopics = async () => {
    setLoading(true);
    setError('');
    try {
      const randomNum = Math.floor(Math.random() * 1000);
      const response = await window.claude.complete(
        `Generate exactly 10 trivia categories for high school students covering science, history, literature, geography, etc. Lots of variation each time. Request #${randomNum}\n\nRespond with ONLY a valid JSON array of 10 topic strings. No other text.`
      );
      const parsed: string[] = JSON.parse(response);
      const shuffled = [...parsed].sort(() => Math.random() - 0.5);
      setTopics(shuffled.slice(0, 5));
    } catch {
      setTopics(['World War II', 'Human Body Systems', "Shakespeare's Plays", 'Solar System', 'American Revolution']);
    }
    setLoading(false);
  };

  const startGame = async (topic: string) => {
    if (!topic.trim()) return;
    setCurrentTopic(topic);
    setGameState('playing');
    setLoading(true);
    setSelectedAnswer(null);
    setError('');

    try {
      const seed = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const response = await window.claude.complete(
        `Create a fact vs fiction challenge about: ${topic}\nRequest #${seed}\n\nGenerate exactly 5 TRUE statements and 2 FALSE statements. False ones should be plausible but wrong.\n\nRespond with ONLY valid JSON:\n{"true_statements":["...","...","...","...","..."],"false_statements":["...","..."],"explanations":["why false 1 is wrong","why false 2 is wrong"]}`
      );
      const data = JSON.parse(response);

      const shuffledTrue = [...data.true_statements].sort(() => Math.random() - 0.5).slice(0, 3);
      const falseIdx = Math.floor(Math.random() * 2);
      const falseStatement: string = data.false_statements[falseIdx];
      const explanation: string = data.explanations[falseIdx];

      const insertAt = Math.floor(Math.random() * 4);
      const statements: string[] = [];
      let trueI = 0;
      for (let i = 0; i < 4; i++) {
        statements.push(i === insertAt ? falseStatement : shuffledTrue[trueI++]);
      }

      setGameData({ statements, correctAnswer: insertAt, explanation });
    } catch {
      setError('Failed to generate challenge. Please try again.');
      setGameState('topic-selection');
    }
    setLoading(false);
  };

  const submitAnswer = (index: number) => {
    if (!gameData) return;
    setSelectedAnswer(index);
    setTotalQuestions(q => q + 1);
    if (index === gameData.correctAnswer) {
      setScore(s => s + 1);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
    setGameState('result');
  };

  const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const isCorrect = selectedAnswer === gameData?.correctAnswer;

  return (
    <>
      <PageHeader
        title="🕵️ Hallucination Detective"
        description="Spot the AI hallucination — test your knowledge and learn to identify false information"
      />

      {/* Stats bar */}
      {totalQuestions > 0 && (
        <div className="stat-row" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-card__value">🏆 {score}</div>
            <div className="stat-card__label">Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">⚡ {streak}</div>
            <div className="stat-card__label">Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">🎯 {accuracy}%</div>
            <div className="stat-card__label">Accuracy</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">🧠 {totalQuestions}</div>
            <div className="stat-card__label">Played</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Topic Selection ── */}
      {gameState === 'topic-selection' && (
        <div className="card" style={{ padding: 24 }}>
          <div className="section__title" style={{ marginBottom: 20 }}>Choose Your Challenge</div>

          <label className="config-form__label" style={{ marginBottom: 16 }}>
            Enter your own topic
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input
                type="text"
                className="config-form__input"
                style={{ flex: 1 }}
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startGame(customTopic)}
                placeholder="e.g. Ancient Rome, Photosynthesis, Jazz History..."
              />
              <button
                className="btn btn--primary"
                onClick={() => startGame(customTopic)}
                disabled={!customTopic.trim() || loading}
              >
                Play
              </button>
            </div>
          </label>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>— or pick a suggested category —</div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-state__icon">⏳</div>
              <div className="empty-state__text">Generating topics...</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
              {topics.map((topic, i) => (
                <button
                  key={i}
                  className="card card--interactive"
                  style={{ padding: '14px 16px', textAlign: 'left', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--border-1)' }}
                  onClick={() => startGame(topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}

          <button
            className="btn btn--ghost btn--sm"
            onClick={generateTopics}
            disabled={loading}
          >
            ↻ Different topics
          </button>
        </div>
      )}

      {/* ── Playing ── */}
      {gameState === 'playing' && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div className="section__title" style={{ marginBottom: 4 }}>Topic: {currentTopic}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              ⚠️ One of these four statements is an AI hallucination. Which one?
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-state__icon">⏳</div>
              <div className="empty-state__text">Generating challenge...</div>
            </div>
          ) : gameData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gameData.statements.map((statement, i) => (
                <button
                  key={i}
                  className="card card--interactive"
                  style={{ padding: '16px 18px', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid var(--border-1)' }}
                  onClick={() => submitAnswer(i)}
                >
                  <span style={{
                    minWidth: 28, height: 28, borderRadius: '50%',
                    background: 'var(--accent-muted)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ lineHeight: 1.5, fontSize: 13 }}>{statement}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Result ── */}
      {gameState === 'result' && gameData && (
        <div className="card" style={{ padding: 24 }}>
          {/* Outcome banner */}
          <div style={{
            textAlign: 'center', padding: '20px 0 24px',
            borderBottom: '1px solid var(--border-0)', marginBottom: 24,
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{isCorrect ? '✅' : '❌'}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: isCorrect ? 'var(--green)' : 'var(--red)', marginBottom: 4 }}>
              {isCorrect ? 'Correct! You spotted the hallucination.' : 'Not quite — the hallucination slipped past you.'}
            </div>
            {streak > 1 && isCorrect && (
              <div style={{ fontSize: 13, color: 'var(--yellow)' }}>⚡ {streak} in a row!</div>
            )}
          </div>

          {/* Statements with labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {gameData.statements.map((statement, i) => {
              const isHallucination = i === gameData.correctAnswer;
              const wasChosen = i === selectedAnswer;
              return (
                <div
                  key={i}
                  style={{
                    padding: '14px 16px', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start',
                    background: isHallucination ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)',
                    border: `1px solid ${isHallucination ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.25)'}`,
                    outline: wasChosen ? `2px solid ${isHallucination ? 'var(--red)' : 'var(--green)'}` : 'none',
                    outlineOffset: 1,
                  }}
                >
                  <span style={{
                    minWidth: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    background: isHallucination ? 'var(--red)' : 'var(--green)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                  }}>
                    {isHallucination ? '✗' : '✓'}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 3 }}>{statement}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isHallucination ? 'var(--red)' : 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isHallucination ? 'Hallucination' : 'True'}
                      {wasChosen ? ' ← your pick' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          <div style={{ padding: '14px 16px', background: 'var(--accent-muted)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 8, marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explanation</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>{gameData.explanation}</div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--primary" onClick={() => setGameState('topic-selection')}>
              Next round
            </button>
            <button className="btn btn--secondary" onClick={() => startGame(currentTopic)}>
              Same topic again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
