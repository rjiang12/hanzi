import { Router } from 'express';
import { db } from '../db.js';

export const statsRouter = Router();

statsRouter.get('/', (_req, res) => {
  const reviewsPerDay = db
    .prepare(
      `
    SELECT date(reviewed_at) AS day, COUNT(*) AS count
    FROM review_log
    WHERE reviewed_at >= datetime('now', '-30 days')
    GROUP BY day
    ORDER BY day
  `,
    )
    .all();

  const retention = db
    .prepare(
      `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN rating > 1 THEN 1 ELSE 0 END) AS passed
    FROM review_log
    WHERE reviewed_at >= datetime('now', '-30 days')
  `,
    )
    .get() as { total: number; passed: number };

  const totals = db
    .prepare(
      `
    SELECT
      COUNT(*) AS total_cards,
      SUM(CASE WHEN state != 0 THEN 1 ELSE 0 END) AS learned
    FROM review_state
  `,
    )
    .get();

  res.json({
    reviewsPerDay,
    retentionRate: retention.total > 0 ? retention.passed / retention.total : null,
    totals,
  });
});
