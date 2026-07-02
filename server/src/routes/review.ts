import { Router } from 'express';
import { db } from '../db.js';
import { applyReview, Rating } from '../fsrs.js';

export const reviewRouter = Router();

const NEW_CARDS_PER_SESSION = 20;

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

reviewRouter.get('/queue', (req, res) => {
  const deckId = req.query.deckId ? Number(req.query.deckId) : undefined;
  const now = new Date().toISOString();
  const deckFilter = deckId ? 'AND c.deck_id = @deckId' : '';

  const due = db
    .prepare(
      `
    SELECT c.*, rs.due, rs.state FROM cards c
    JOIN review_state rs ON rs.card_id = c.id
    WHERE rs.state != 0 AND rs.due <= @now ${deckFilter}
    ORDER BY rs.due ASC
  `,
    )
    .all(deckId ? { now, deckId } : { now });

  const newCards = db
    .prepare(
      `
    SELECT c.*, rs.due, rs.state FROM cards c
    JOIN review_state rs ON rs.card_id = c.id
    WHERE rs.state = 0 ${deckFilter}
    ORDER BY c.id ASC
    LIMIT @limit
  `,
    )
    .all(deckId ? { deckId, limit: NEW_CARDS_PER_SESSION } : { limit: NEW_CARDS_PER_SESSION });

  // Nothing due or new left (e.g. a fully-learned deck) - let the deck still be studied
  // ahead of schedule instead of locking it out until the next due date rolls around.
  let aheadOfSchedule = false;
  let ahead: unknown[] = [];
  if (due.length === 0 && newCards.length === 0) {
    ahead = db
      .prepare(
        `
      SELECT c.*, rs.due, rs.state FROM cards c
      JOIN review_state rs ON rs.card_id = c.id
      WHERE rs.state != 0 ${deckFilter}
      ORDER BY rs.due ASC
      LIMIT @limit
    `,
      )
      .all(deckId ? { deckId, limit: NEW_CARDS_PER_SESSION } : { limit: NEW_CARDS_PER_SESSION });
    aheadOfSchedule = ahead.length > 0;
  }

  // Cards come back in query order (due date / insertion order, which tracks the
  // seed data's alphabetical-by-pinyin ordering) - shuffle within each group so study
  // order isn't predictable, while still reviewing due cards before new ones.
  const shuffledDue = shuffle(due);
  const shuffledNew = shuffle(newCards);
  const shuffledAhead = shuffle(ahead);

  res.json({
    due: shuffledDue,
    new: shuffledNew,
    aheadOfSchedule,
    queue: [...shuffledDue, ...shuffledNew, ...shuffledAhead],
  });
});

reviewRouter.post('/:cardId', (req, res) => {
  const cardId = Number(req.params.cardId);
  const rating = Number(req.body?.rating) as Rating;

  if (![Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].includes(rating)) {
    res.status(400).json({ error: 'rating must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy)' });
    return;
  }

  try {
    const updated = applyReview(cardId, rating as Exclude<Rating, Rating.Manual>);
    res.json({ due: updated.due, state: updated.state, stability: updated.stability, difficulty: updated.difficulty });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});
