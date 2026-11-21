export const MARK_REFRESH_TOKEN_USED = `
local key = KEYS[1]
local usedAt = ARGV[1]

local raw = redis.call('GET', key)
if not raw then return 0 end

local record = cjson.decode(raw)

if record.usedAt ~= nil
    and record.usedAt ~= cjson.null then
    return 0
end

record.usedAt = usedAt

redis.call(
    'SET',
    key,
    cjson.encode(record),
    'XX',
    'KEEPTTL'
)

return 1
`;

export const REVOKE_REFRESH_FAMILY = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end

local family = cjson.decode(raw)

family.revoked = true

redis.call(
  'SET',
  KEYS[1],
  cjson.encode(family),
  'XX',
  'KEEPTTL'
)

return 1
`;

export const VALIDATE_AND_TOUCH_FAMILY = `
local key = KEYS[1]
local expectedUserId = ARGV[1]
local expectedSid = ARGV[2]
local idleTtlMs = tonumber(ARGV[3])

local raw = redis.call('GET', key)
if not raw then return 0 end

local family = cjson.decode(raw)

if family.revoked
    or family.userId ~= expectedUserId
    or family.sid ~= expectedSid then
  return 0
end

local time = redis.call('TIME')
local nowMs = tonumber(time[1]) * 1000
  + math.floor(tonumber(time[2]) / 1000)
local familyExpiresAt = tonumber(family.familyExpiresAt)
local lastActiveAt = tonumber(family.lastActiveAt)

if not idleTtlMs or not familyExpiresAt or not lastActiveAt then
  return 0
end

if nowMs >= familyExpiresAt
    or nowMs - lastActiveAt >= idleTtlMs then
  family.revoked = true
  redis.call('SET', key, cjson.encode(family), 'XX', 'KEEPTTL')
  return 0
end

family.lastActiveAt = nowMs
redis.call('SET', key, cjson.encode(family), 'XX', 'KEEPTTL')

return 1
`;

export const SAVE_REFRESH_TOKEN = `
-- KEYS[1] = auth:family:{familyId}
-- KEYS[2] = auth:refresh:{refreshTokenId}
-- KEYS[3] = auth:user:families:{userId}
-- KEYS[4] = auth:sid:{sid}
--
-- ARGV[1] = JSON family record
-- ARGV[2] = JSON refresh-token record
-- ARGV[3] = TTL до familyExpiresAt, у мілісекундах
-- ARGV[4] = familyExpiresAt, Unix timestamp у мілісекундах
-- ARGV[5] = idle timeout у мілісекундах

local familyKey = KEYS[1]
local refreshKey = KEYS[2]
local userFamiliesKey = KEYS[3]
local sidIndexKey = KEYS[4]

local familyJson = ARGV[1]
local refreshJson = ARGV[2]
local requestedTtlMs = tonumber(ARGV[3])
local familyExpiresAt = tonumber(ARGV[4])
local idleTtlMs = tonumber(ARGV[5])

if not requestedTtlMs or requestedTtlMs <= 0
    or not familyExpiresAt or not idleTtlMs or idleTtlMs <= 0 then
  return redis.error_reply('Invalid TTL or family expiration')
end

local okFamily, familyArg = pcall(cjson.decode, familyJson)
local okRefresh, refreshRecord = pcall(cjson.decode, refreshJson)

if not okFamily or not okRefresh then
  return redis.error_reply('Invalid JSON')
end

local sid = familyArg.sid
local userId = familyArg.userId
local familyId = refreshRecord.familyId

if not sid or not userId or not familyId then
  return redis.error_reply('Missing family, user, or sid')
end

if refreshRecord.userId ~= userId
    or not refreshRecord.claims
    or refreshRecord.claims.sid ~= sid then
  return redis.error_reply('Family and refresh record do not match')
end

if redis.call('EXISTS', refreshKey) == 1 then
  return -2
end

local existingFamilyRaw = redis.call('GET', familyKey)
local familyTtlMs = requestedTtlMs
local createFamily = false
local time = redis.call('TIME')
local nowMs = tonumber(time[1]) * 1000
  + math.floor(tonumber(time[2]) / 1000)

if nowMs >= familyExpiresAt then
  return -5 -- absolute family expiration reached
end

if existingFamilyRaw then
  local okExisting, existingFamily = pcall(cjson.decode, existingFamilyRaw)

  if not okExisting then
    return redis.error_reply('Stored family JSON is invalid')
  end

  if existingFamily.revoked then
    return -3
  end

  if existingFamily.userId ~= userId
      or existingFamily.sid ~= sid
      or tonumber(existingFamily.familyExpiresAt) ~= familyExpiresAt then
    return -4
  end

  local lastActiveAt = tonumber(existingFamily.lastActiveAt)
  if not lastActiveAt then
    return -6 -- family створена до підтримки idle timeout
  end

  if nowMs - lastActiveAt >= idleTtlMs then
    existingFamily.revoked = true
    redis.call('SET', familyKey, cjson.encode(existingFamily), 'XX', 'KEEPTTL')
    return -7 -- idle timeout минув
  end

  existingFamily.lastActiveAt = nowMs
  familyJson = cjson.encode(existingFamily)

  local existingFamilyTtl = redis.call('PTTL', familyKey)

  if existingFamilyTtl == -2 then
    return -5 -- family зникла
  elseif existingFamilyTtl == -1 then
    familyTtlMs = requestedTtlMs
  else
    if existingFamilyTtl <= 0 then
      return -5
    end

    familyTtlMs = math.min(existingFamilyTtl, requestedTtlMs)
  end
else
  createFamily = true
end

local sidFamilyId = redis.call('GET', sidIndexKey)

if sidFamilyId and sidFamilyId ~= familyId then
  return -4
end

local userIndexTtl = redis.call('PTTL', userFamiliesKey)

if createFamily then
  familyArg.lastActiveAt = nowMs
  familyJson = cjson.encode(familyArg)
  redis.call('SET', familyKey, familyJson, 'PX', familyTtlMs)
else
  redis.call('SET', familyKey, familyJson, 'XX', 'KEEPTTL')
  if redis.call('PTTL', familyKey) == -1 then
    redis.call('PEXPIRE', familyKey, familyTtlMs)
  end
end

redis.call('SET', refreshKey, refreshJson, 'PX', familyTtlMs)

redis.call(
  'ZADD',
  userFamiliesKey,
  familyExpiresAt,
  familyId
)

if userIndexTtl == -2 then
  redis.call('PEXPIRE', userFamiliesKey, familyTtlMs)
elseif userIndexTtl >= 0 and userIndexTtl < familyTtlMs then
  redis.call('PEXPIRE', userFamiliesKey, familyTtlMs)
end

if not sidFamilyId then
  redis.call('SET', sidIndexKey, familyId, 'PX', familyTtlMs)
elseif redis.call('PTTL', sidIndexKey) == -1 then
  redis.call('PEXPIRE', sidIndexKey, familyTtlMs)
end

if createFamily then
  return 1
end

return 2`;
