import { createEmptyCard, fsrs, Rating, State, type Card } from 'ts-fsrs';
import { db } from './db.js';

export { Rating, State };

const scheduler = fsrs();

interface ReviewStateRow {
  card_id: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
}

function rowToCard(row: ReviewStateRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

const insertState = db.prepare(`
  INSERT INTO review_state
    (card_id, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review)
  VALUES (@card_id, @due, @stability, @difficulty, @elapsed_days, @scheduled_days, @reps, @lapses, @state, @last_review)
  ON CONFLICT(card_id) DO UPDATE SET
    due=excluded.due, stability=excluded.stability, difficulty=excluded.difficulty,
    elapsed_days=excluded.elapsed_days, scheduled_days=excluded.scheduled_days,
    reps=excluded.reps, lapses=excluded.lapses, state=excluded.state, last_review=excluded.last_review
`);

export function initReviewState(cardId: number, now = new Date()) {
  const card = createEmptyCard(now);
  insertState.run({
    card_id: cardId,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  });
}

const getState = db.prepare('SELECT * FROM review_state WHERE card_id = @card_id');

const insertLog = db.prepare(`
  INSERT INTO review_log (card_id, rating, reviewed_at, elapsed_days, scheduled_days, state_before)
  VALUES (@card_id, @rating, @reviewed_at, @elapsed_days, @scheduled_days, @state_before)
`);

export function applyReview(cardId: number, rating: Exclude<Rating, Rating.Manual>, now = new Date()) {
  const row = getState.get({ card_id: cardId }) as ReviewStateRow | undefined;
  if (!row) throw new Error(`No review_state for card ${cardId}`);

  const before = rowToCard(row);
  const { card: after, log } = scheduler.next(before, now, rating);

  insertState.run({
    card_id: cardId,
    due: after.due.toISOString(),
    stability: after.stability,
    difficulty: after.difficulty,
    elapsed_days: after.elapsed_days,
    scheduled_days: after.scheduled_days,
    reps: after.reps,
    lapses: after.lapses,
    state: after.state,
    last_review: after.last_review ? after.last_review.toISOString() : null,
  });

  insertLog.run({
    card_id: cardId,
    rating,
    reviewed_at: now.toISOString(),
    elapsed_days: log.elapsed_days,
    scheduled_days: log.scheduled_days,
    state_before: before.state,
  });

  return after;
}
