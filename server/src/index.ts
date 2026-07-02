import cors from 'cors';
import express from 'express';
import './db.js';
import { cardsRouter } from './routes/cards.js';
import { decksRouter } from './routes/decks.js';
import { reviewRouter } from './routes/review.js';
import { statsRouter } from './routes/stats.js';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

app.use('/api/decks', decksRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/review', reviewRouter);
app.use('/api/stats', statsRouter);

app.listen(PORT, () => {
  console.log(`hanzi server listening on http://localhost:${PORT}`);
});
