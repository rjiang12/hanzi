import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../db.js';
import { initReviewState } from '../fsrs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_URL = 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json';
const FALLBACK_PATH = join(__dirname, '..', '..', 'data', 'raw', 'complete.json');

interface HskEntry {
  simplified: string;
  level: string[];
  forms: {
    transcriptions: { pinyin: string };
    meanings: string[];
  }[];
}

async function loadEntries(): Promise<HskEntry[]> {
  try {
    const res = await fetch(RAW_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HskEntry[];
  } catch (err) {
    if (existsSync(FALLBACK_PATH)) {
      console.warn(`Network fetch failed (${(err as Error).message}), using local fallback at ${FALLBACK_PATH}`);
      return JSON.parse(readFileSync(FALLBACK_PATH, 'utf-8'));
    }
    console.error(`
Failed to fetch HSK vocabulary dataset from:
  ${RAW_URL}
Reason: ${(err as Error).message}

To proceed offline, manually download that file and save it to:
  ${FALLBACK_PATH}
then re-run "npm run seed".
`);
    process.exit(1);
  }
}

function deckNameForLevels(levels: string[]): string | null {
  const oldLevel = levels.find((l) => l.startsWith('old-'));
  if (oldLevel) {
    const n = oldLevel.split('-')[1];
    return `HSK ${n}`;
  }
  const newLevel = levels.find((l) => l.startsWith('new-') && Number(l.split('-')[1]) >= 7);
  if (newLevel) return 'HSK 7-9';
  return null;
}

async function main() {
  const entries = await loadEntries();
  if (!entries) return;

  const getOrCreateDeck = db.prepare('INSERT OR IGNORE INTO decks (name) VALUES (?)');
  const findDeck = db.prepare('SELECT id FROM decks WHERE name = ?');
  const findExisting = db.prepare("SELECT 1 FROM cards WHERE deck_id = ? AND hanzi = ? AND source = 'hsk'");
  const insertCard = db.prepare(
    'INSERT INTO cards (deck_id, hanzi, pinyin, meaning, hsk_level, source) VALUES (?, ?, ?, ?, ?, ?)',
  );

  const deckIds = new Map<string, number>();
  const seen = new Set<string>();
  let inserted = 0;
  let skipped = 0;

  db.exec('BEGIN');
  try {
    for (const entry of entries) {
      const deckName = deckNameForLevels(entry.level);
      if (!deckName || !entry.forms?.length) continue;

      const key = `${deckName}:${entry.simplified}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!deckIds.has(deckName)) {
        getOrCreateDeck.run(deckName);
        const row = findDeck.get(deckName) as { id: number };
        deckIds.set(deckName, row.id);
      }
      const deckId = deckIds.get(deckName)!;

      if (findExisting.get(deckId, entry.simplified)) {
        skipped++;
        continue;
      }

      const form = entry.forms[0];
      const pinyin = form.transcriptions?.pinyin ?? '';
      const meaning = (form.meanings ?? []).slice(0, 3).join('; ');
      if (!pinyin || !meaning) continue;

      const info = insertCard.run(deckId, entry.simplified, pinyin, meaning, deckName, 'hsk');
      initReviewState(Number(info.lastInsertRowid));
      inserted++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  console.log(`Seed complete: ${deckIds.size} decks, ${inserted} cards inserted, ${skipped} already present (skipped).`);
  for (const [name, id] of deckIds) {
    const count = (db.prepare('SELECT COUNT(*) AS n FROM cards WHERE deck_id = ?').get(id) as { n: number }).n;
    console.log(`  ${name}: ${count} cards`);
  }
}

main();
