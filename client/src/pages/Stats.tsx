import { useEffect, useState } from 'react';
import { api, type Stats as StatsData } from '../api.ts';

export default function Stats() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    api.getStats().then(setStats);
  }, []);

  if (!stats) return <p>Loading...</p>;

  const max = Math.max(1, ...stats.reviewsPerDay.map((d) => d.count));

  return (
    <div>
      <p>
        Cards learned: <strong>{stats.totals.learned}</strong> / {stats.totals.total_cards}
      </p>
      <p>
        Retention (last 30 days):{' '}
        <strong>{stats.retentionRate === null ? '—' : `${Math.round(stats.retentionRate * 100)}%`}</strong>
      </p>
      <h4>Reviews per day (last 30 days)</h4>
      {stats.reviewsPerDay.length === 0 ? (
        <p className="empty-state">No reviews yet.</p>
      ) : (
        <div className="stat-bars">
          {stats.reviewsPerDay.map((d) => (
            <div
              key={d.day}
              className="bar"
              style={{ height: `${(d.count / max) * 100}%` }}
              title={`${d.day}: ${d.count}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
