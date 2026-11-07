export const VALIDATE_AND_TOUCH = `
local key = KEYS[1]
local idleTtlMs = tonumber(ARGV[1])

local raw = redis.call('GET', key)
if not raw then return nil end

local session = cjson.decode(raw)
local time = redis.call('TIME')
local nowMs = tonumber(time[1]) * 1000
    + math.floor(tonumber(time[2]) / 1000)

local remainingMs = session.absoluteExpiresAt - nowMs

if remainingMs <= 0 then
    redis.call('DEL', key)
    return nil
end

redis.call('PEXPIRE', key, math.min(idleTtlMs, remainingMs))
return raw
`;
