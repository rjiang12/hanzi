import { useEffect, useState } from 'react';
import { api, type Card, type Deck } from '../api.ts';

export default function Browse() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState<number | undefined>(undefined);
  const [cards, setCards] = useState<Card[]>([]);
  const [form, setForm] = useState({ hanzi: '', pinyin: '', meaning: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDecks().then(setDecks);
  }, []);

  useEffect(() => {
    api.getCards(deckId).then(setCards);
  }, [deckId]);

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const card = await api.createCard(form);
      setForm({ hanzi: '', pinyin: '', meaning: '' });
      if (!deckId || card.deck_id === deckId) setCards((cs) => [...cs, card]);
      api.getDecks().then(setDecks);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeCard(id: number) {
    await api.deleteCard(id);
    setCards((cs) => cs.filter((c) => c.id !== id));
  }

  return (
    <div>
      <form className="form-row" onSubmit={addCard}>
        <input
          placeholder="Hanzi"
          value={form.hanzi}
          onChange={(e) => setForm({ ...form, hanzi: e.target.value })}
          required
        />
        <input
          placeholder="Pinyin"
          value={form.pinyin}
          onChange={(e) => setForm({ ...form, pinyin: e.target.value })}
          required
        />
        <input
          placeholder="Meaning"
          value={form.meaning}
          onChange={(e) => setForm({ ...form, meaning: e.target.value })}
          required
        />
        <button className="primary" type="submit">
          Add card
        </button>
      </form>
      {error && <p style={{ color: '#ff8a65' }}>{error}</p>}

      <div className="form-row">
        <select
          value={deckId ?? ''}
          onChange={(e) => setDeckId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All decks</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <table className="card-table">
        <thead>
          <tr>
            <th>Hanzi</th>
            <th>Pinyin</th>
            <th>Meaning</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr key={c.id}>
              <td>{c.hanzi}</td>
              <td>{c.pinyin}</td>
              <td>{c.meaning}</td>
              <td>
                {c.source === 'custom' && <button onClick={() => removeCard(c.id)}>Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
