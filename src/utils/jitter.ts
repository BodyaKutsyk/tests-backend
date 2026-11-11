export const jitter = (ttl: number, fraction: number = 0.1): number => {
  const maxDeviation = ttl * fraction;
  const randomDeviation = (Math.random() * 2 - 1) * maxDeviation;
  return Math.max(1, Math.round(ttl + randomDeviation));
};
