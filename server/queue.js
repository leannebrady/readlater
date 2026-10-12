const DAY = 864e5;

// Higher score = read sooner. Mixes manual priority, freshness, a slow
// "resurface old saves" nudge, and a bonus for short reads.
export function score(a, now = Date.now()) {
  const ageDays = (now - a.saved_at) / DAY;
  const recency = Math.exp(-ageDays / 14) * 5;
  const resurface = Math.min(ageDays / 30, 1) * 2;
  const minutes = a.word_count / 230;
  const quick = minutes < 5 ? 1.5 : minutes < 15 ? 0.5 : 0;
  return a.priority * 3 + recency + resurface + quick;
}

export function readNext(rows, limit = 10, now = Date.now()) {
  return rows
    .filter((a) => !a.read)
    .map((a) => ({ ...a, score: Number(score(a, now).toFixed(2)) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}
