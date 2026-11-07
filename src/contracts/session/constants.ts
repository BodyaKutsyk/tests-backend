export const getRedisSessionKey = (sessionId: string) =>
  `auth:session:${sessionId}`;
