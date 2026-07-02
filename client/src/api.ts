export interface Deck {
  id: number;
  name: string;
  total: number;
  new_count: number;
  due_count: number;
}

export interface Card {
  id: number;
  deck_id: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  hsk_level: string | null;
  source: string;
}

export interface QueueResponse {
  due: Card[];
  new: Card[];
  queue: Card[];
}

export interface Stats {
  reviewsPerDay: { day: string; count: number }[];
  retentionRate: number | null;
  totals: { total_cards: number; learned: number };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getDecks: () => request<Deck[]>('/decks'),
  getCards: (deckId?: number) => request<Card[]>(`/cards${deckId ? `?deckId=${deckId}` : ''}`),
  createCard: (card: { hanzi: string; pinyin: string; meaning: string }) =>
    request<Card>('/cards', { method: 'POST', body: JSON.stringify(card) }),
  updateCard: (id: number, card: Partial<{ hanzi: string; pinyin: string; meaning: string }>) =>
    request<Card>(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(card) }),
  deleteCard: (id: number) => request<void>(`/cards/${id}`, { method: 'DELETE' }),
  getQueue: (deckId?: number) => request<QueueResponse>(`/review/queue${deckId ? `?deckId=${deckId}` : ''}`),
  submitReview: (cardId: number, rating: 1 | 2 | 3 | 4) =>
    request<{ due: string; state: number }>(`/review/${cardId}`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    }),
  getStats: () => request<Stats>('/stats'),
};
