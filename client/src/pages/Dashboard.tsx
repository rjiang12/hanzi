import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Deck } from '../api.ts';

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getDecks().then(setDecks);
  }, []);

  if (!decks) return <p>Loading...</p>;
  if (decks.length === 0) {
    return (
      <div className="empty-state">
        No decks yet. Run <code>npm run seed</code> to load the HSK vocabulary, or add a custom card in Browse.
      </div>
    );
  }

  return (
    <div className="deck-list">
      {decks.map((deck) => (
        <div className="deck-row" key={deck.id}>
          <div>
            <strong>{deck.name}</strong>
            <div className="counts">
              <span className="due">{deck.due_count} due</span>
              <span className="new">{deck.new_count} new</span>
              <span>{deck.total} total</span>
            </div>
          </div>
          <button className="primary" disabled={deck.total === 0} onClick={() => navigate(`/review/${deck.id}`)}>
            Study
          </button>
        </div>
      ))}
    </div>
  );
}
