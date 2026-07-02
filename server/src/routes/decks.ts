import { Router } from 'express';
import { db } from '../db.js';

export const decksRouter = Router();

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
    .all({ now });
  res.json(decks);
});
