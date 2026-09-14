EXPLAIN (ANALYSE, BUFFERS)
SELECT id, name, ts_rank(search_vector, plainto_tsquery('simple', 'основами docker')) as rank
FROM tests
WHERE search_vector @@ plainto_tsquery('simple', 'основами docker');