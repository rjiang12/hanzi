import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Card } from '../api.ts';

const RATINGS: { rating: 1 | 2 | 3 | 4; label: string; key: string; className: string }[] = [
  { rating: 1, label: 'Again', key: '1', className: 'rating-again' },
  { rating: 2, label: 'Hard', key: '2', className: 'rating-hard' },
  { rating: 3, label: 'Good', key: '3', className: 'rating-good' },
  { rating: 4, label: 'Easy', key: '4', className: 'rating-easy' },
];

export default function Review() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [exhaustedEmpty, setExhaustedEmpty] = useState(false);

  const loadQueue = useCallback(() => {
    return api.getQueue(deckId ? Number(deckId) : undefined).then((res) => {
      setExhaustedEmpty(res.queue.length === 0);
      setQueue(res.queue);
      setIndex(0);
      setRevealed(false);
    });
  }, [deckId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const current = queue?.[index];

  const reveal = useCallback(() => setRevealed(true), []);

  const rate = useCallback(
    async (rating: 1 | 2 | 3 | 4) => {
      if (!current) return;
      await api.submitReview(current.id, rating);
      setRevealed(false);
      setIndex((i) => i + 1);
    },
    [current],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        reveal();
        return;
      }
      if (revealed) {
        const match = RATINGS.find((r) => r.key === e.key);
        if (match) rate(match.rating);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, revealed, reveal, rate]);

  if (!queue) return <p>Loading...</p>;

  if (!current) {
    return (
      <div className="empty-state">
        <p>{exhaustedEmpty ? 'Nothing more due right now.' : 'All done for now.'}</p>
        <div className="rating-row">
          {!exhaustedEmpty && <button className="primary" onClick={loadQueue}>Continue</button>}
          <button onClick={() => navigate('/')}>Back to dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-card">
      <div className="hanzi">{current.hanzi}</div>
      <div className="reveal">
        {revealed ? (
          <>
            <div className="pinyin">{current.pinyin}</div>
            <div className="meaning">{current.meaning}</div>
          </>
        ) : (
          <button onClick={reveal}>Show answer (space)</button>
        )}
      </div>
      {revealed && (
        <div className="rating-row">
          {RATINGS.map((r) => (
            <button key={r.rating} className={r.className} onClick={() => rate(r.rating)}>
              {r.label}
              <span className="key">{r.key}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
