EXPLAIN (ANALYSE, BUFFERS)
SELECT *
FROM users
LEFT JOIN documents
ON users.id = documents.user_id
WHERE documents.user_id IS NULL
ORDER BY users.created_at
LIMIT 100;
