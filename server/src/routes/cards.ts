import { Router } from 'express';
import { db } from '../db.js';
import { initReviewState } from '../fsrs.js';

export const cardsRouter = Router();

cardsRouter.get('/', (req, res) => {
  const deckId = req.query.deckId ? Number(req.query.deckId) : undefined;
  const rows = deckId
    ? db.prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY id').all(deckId)
    : db.prepare('SELECT * FROM cards ORDER BY id').all();
  res.json(rows);
});

const CUSTOM_DECK_NAME = 'Custom';

function getOrCreateCustomDeck(): number {
  const existing = db.prepare('SELECT id FROM decks WHERE name = ?').get(CUSTOM_DECK_NAME) as
    | { id: number }
    | undefined;
  if (existing) return existing.id;
  const info = db.prepare('INSERT INTO decks (name) VALUES (?)').run(CUSTOM_DECK_NAME);
  return Number(info.lastInsertRowid);
}

cardsRouter.post('/', (req, res) => {
  const { hanzi, pinyin, meaning } = req.body ?? {};
  if (!hanzi || !pinyin || !meaning) {
    res.status(400).json({ error: 'hanzi, pinyin, and meaning are required' });
    return;
  }

  const deckId = getOrCreateCustomDeck();
  const info = db
    .prepare('INSERT INTO cards (deck_id, hanzi, pinyin, meaning, source) VALUES (?, ?, ?, ?, ?)')
    .run(deckId, hanzi, pinyin, meaning, 'custom');
  const cardId = Number(info.lastInsertRowid);
  initReviewState(cardId);

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  res.status(201).json(card);
});

cardsRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'card not found' });
    return;
  }
  const { hanzi, pinyin, meaning } = req.body ?? {};
  db.prepare(
    'UPDATE cards SET hanzi = COALESCE(?, hanzi), pinyin = COALESCE(?, pinyin), meaning = COALESCE(?, meaning) WHERE id = ?',
  ).run(hanzi ?? null, pinyin ?? null, meaning ?? null, id);
  res.json(db.prepare('SELECT * FROM cards WHERE id = ?').get(id));
});

cardsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM cards WHERE id = ?').run(id);
  res.status(204).end();
});
