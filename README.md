# hanzi

Anki-style spaced-repetition trainer for reading Chinese simplified characters, using FSRS scheduling and an HSK-seeded vocabulary.

## Setup

```
npm install
npm run seed   # downloads HSK vocab + pinyin/meanings, populates server/data/hanzi.sqlite
npm run dev    # starts Express API (:3001) and Vite dev server (:5173)
```

Open http://localhost:5173.

## Layout

- `server/` — Express + TypeScript API, `node:sqlite` for storage, `ts-fsrs` for scheduling.
- `client/` — React + Vite frontend (Dashboard, Review, Browse, Stats).
