export const GENERATION_JOBS_EXCHANGE = 'generation_jobs.events';
export const GENERATION_JOBS_DLQ_QUEUE = 'generatiob_jobs_dlq';
export const GENERATION_JOBS_DLX = 'generation_jobs_dlx';
export const GENERATION_JOBS_ROUTING_KEYS = {
  CREATED: 'generation_jobs.created',
};

export const REDIS_USER_TESTS_CACHE_KEY = `user-tests`;
export const REDIS_USER_TESTS_LOCK_KEY = 'lock:users-tests';

export const getRedisUserTestsCacheKey = (userId: string) =>
  `${REDIS_USER_TESTS_CACHE_KEY}:${userId}`;

export const getRedisUserTestsLockKey = (userId: string) =>
  `${REDIS_USER_TESTS_LOCK_KEY}:${userId}`;
