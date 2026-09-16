EXPLAIN (ANALYSE, BUFFERS)
SELECT *
FROM documents
WHERE documents.created_at BETWEEN '2025-10-06' AND '2026-01-01' AND mime_type IN ('text/csv', 'application/json');