export const getRedisSessionKey = (sessionId: string) =>
  `auth:session:${sessionId}`;

export const getRedisRefreshTokenKey = (id: string) => `auth:refresh:${id}`;

export const getRedisFamilyKey = (id: string) => `auth:family:${id}`;

export const getRedisUserFamiliesKey = (uId: string) =>
  `auth:user:families:${uId}`;

export const getRedisSidFamilyKey = (sid: string) => `auth:sid:${sid}`;
