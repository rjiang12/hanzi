import { Router } from 'express';
import { db } from '../db.js';

export const decksRouter = Router();

interface DeckRow {
  id: number;
  name: string;
  total: number;
  new_count: number;
  due_count: number;
}

interface RatingRow {
  deck_id: number;
  rating: 1 | 2 | 3 | 4;
  count: number;
}

decksRouter.get('/', (_req, res) => {
  const now = new Date().toISOString();
  const decks = db
    .prepare(
      `
    SELECT
      d.id,
      d.name,
      COUNT(c.id) AS total,
      SUM(CASE WHEN rs.state = 0 THEN 1 ELSE 0 END) AS new_count,
      SUM(CASE WHEN rs.state != 0 AND rs.due <= @now THEN 1 ELSE 0 END) AS due_count
    FROM decks d
    LEFT JOIN cards c ON c.deck_id = d.id
    LEFT JOIN review_state rs ON rs.card_id = c.id
    GROUP BY d.id
    ORDER BY d.id
  `,
    )
    .all({ now }) as unknown as DeckRow[];

  // Breakdown of each card's most recent rating, per deck - lets the dashboard show
  // how many cards currently sit at Again/Hard/Good/Easy once review has started.
  const ratingRows = db
    .prepare(
      `
    WITH latest_review AS (
      SELECT card_id, rating,
        ROW_NUMBER() OVER (PARTITION BY card_id ORDER BY reviewed_at DESC, id DESC) AS rn
      FROM review_log
    )
    SELECT c.deck_id AS deck_id, lr.rating AS rating, COUNT(*) AS count
    FROM latest_review lr
    JOIN cards c ON c.id = lr.card_id
    WHERE lr.rn = 1
    GROUP BY c.deck_id, lr.rating
  `,
    )
    .all() as unknown as RatingRow[];

  const ratingsByDeck = new Map<number, { again: number; hard: number; good: number; easy: number }>();
  for (const row of ratingRows) {
    const bucket = ratingsByDeck.get(row.deck_id) ?? { again: 0, hard: 0, good: 0, easy: 0 };
    if (row.rating === 1) bucket.again = row.count;
    else if (row.rating === 2) bucket.hard = row.count;
    else if (row.rating === 3) bucket.good = row.count;
    else if (row.rating === 4) bucket.easy = row.count;
    ratingsByDeck.set(row.deck_id, bucket);
  }

  const result = decks.map((deck) => ({
    ...deck,
    ratings: ratingsByDeck.get(deck.id) ?? null,
  }));

  res.json(result);
});
