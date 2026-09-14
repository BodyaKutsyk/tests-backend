# Query execution optimizations
This document compares query execution before and after indexing creating
## `1.sql`
### Before
```sql

                                                                                                            QUERY PLAN                                                                                                             
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..32205.67 rows=6820 width=155) (actual time=0.244..32.959 rows=6520 loops=1)
   Workers Planned: 2
   Workers Launched: 2
   Buffers: shared hit=11761 read=11477
   ->  Parallel Seq Scan on documents  (cost=0.00..30523.67 rows=2842 width=155) (actual time=0.036..29.243 rows=2173 loops=3)
         Filter: ((created_at >= '2025-10-06 00:00:00+00'::timestamp with time zone) AND (created_at <= '2026-01-01 00:00:00+00'::timestamp with time zone) AND ((mime_type)::text = ANY ('{text/csv,application/json}'::text[])))
         Rows Removed by Filter: 331160
         Buffers: shared hit=11761 read=11477
 Planning:
   Buffers: shared hit=177
 Planning Time: 0.356 ms
 Execution Time: 33.164 ms
(12 rows)
```
### After
```sql

                                                                                                              QUERY PLAN                                                                                                               
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on documents  (cost=255.81..15138.26 rows=6820 width=155) (actual time=1.250..8.052 rows=6520 loops=1)
   Recheck Cond: (((mime_type)::text = ANY ('{text/csv,application/json}'::text[])) AND (created_at >= '2025-10-06 00:00:00+00'::timestamp with time zone) AND (created_at <= '2026-01-01 00:00:00+00'::timestamp with time zone))
   Heap Blocks: exact=5678
   Buffers: shared hit=5720
   ->  Bitmap Index Scan on idx_document_mime_created  (cost=0.00..254.10 rows=6820 width=0) (actual time=0.703..0.704 rows=6520 loops=1)
         Index Cond: (((mime_type)::text = ANY ('{text/csv,application/json}'::text[])) AND (created_at >= '2025-10-06 00:00:00+00'::timestamp with time zone) AND (created_at <= '2026-01-01 00:00:00+00'::timestamp with time zone))
         Buffers: shared hit=42
 Planning:
   Buffers: shared hit=233
 Planning Time: 0.468 ms
 Execution Time: 8.256 ms
(11 rows)
```
After creating `idx_document_mime_created`, PostgreSQL replaced the Parallel Seq Scan with a Bitmap Index Scan followed by a Bitmap Heap Scan. The index matches the filtering by mime_type and created_at, reducing shared buffer accesses from about 23k to 5.7k and execution time from 33 ms to 8 ms.
```
Before:
Parallel Seq Scan
Buffers: 11761 hit + 11477 read = 23238

After:
Bitmap Index Scan on idx_document_mime_created
→ Bitmap Heap Scan
Buffers: 5720
```
## `2.sql`
### Before
```sql

                                                                     QUERY PLAN                                                                      
-----------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=34230.88..34242.55 rows=100 width=265) (actual time=108.902..110.683 rows=100 loops=1)
   Buffers: shared hit=13467 read=11727
   ->  Gather Merge  (cost=34230.88..43856.55 rows=82500 width=265) (actual time=108.901..110.678 rows=100 loops=1)
         Workers Planned: 2
         Workers Launched: 2
         Buffers: shared hit=13467 read=11727
         ->  Sort  (cost=33230.86..33333.98 rows=41250 width=265) (actual time=82.004..82.010 rows=33 loops=3)
               Sort Key: users.created_at
               Sort Method: top-N heapsort  Memory: 63kB
               Buffers: shared hit=13467 read=11727
               Worker 0:  Sort Method: quicksort  Memory: 25kB
               Worker 1:  Sort Method: quicksort  Memory: 25kB
               ->  Parallel Hash Right Anti Join  (cost=3115.54..31654.31 rows=41250 width=265) (actual time=69.287..74.908 rows=33000 loops=3)
                     Hash Cond: (documents.user_id = users.id)
                     Buffers: shared hit=13393 read=11727
                     ->  Parallel Seq Scan on documents  (cost=0.00..27398.67 rows=416667 width=155) (actual time=0.021..20.438 rows=333333 loops=3)
                           Buffers: shared hit=11505 read=11727
                     ->  Parallel Hash  (cost=2380.24..2380.24 rows=58824 width=110) (actual time=10.267..10.268 rows=33333 loops=3)
                           Buckets: 131072  Batches: 1  Memory Usage: 15488kB
                           Buffers: shared hit=1792
                           ->  Parallel Seq Scan on users  (cost=0.00..2380.24 rows=58824 width=110) (actual time=0.004..2.125 rows=33333 loops=3)
                                 Buffers: shared hit=1792
 Planning:
   Buffers: shared hit=326 read=1
 Planning Time: 0.609 ms
 Execution Time: 110.741 ms
(26 rows)
```
### After
```sql

                                                                     QUERY PLAN                                                                     
----------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=0.72..55.42 rows=100 width=265) (actual time=0.021..0.412 rows=100 loops=1)
   Buffers: shared hit=402
   ->  Nested Loop Anti Join  (cost=0.72..54157.15 rows=99000 width=265) (actual time=0.020..0.405 rows=100 loops=1)
         Buffers: shared hit=402
         ->  Index Scan using idx_created_at_user on users  (cost=0.29..9772.21 rows=100000 width=110) (actual time=0.013..0.189 rows=100 loops=1)
               Buffers: shared hit=102
         ->  Index Scan using idx_document_user_id on documents  (cost=0.42..18.89 rows=1000 width=155) (actual time=0.002..0.002 rows=0 loops=100)
               Index Cond: (user_id = users.id)
               Buffers: shared hit=300
 Planning:
   Buffers: shared hit=404
 Planning Time: 0.714 ms
 Execution Time: 0.444 ms
(13 rows)
```
After creating `idx_created_at_user` and `idx_document_user_id`, PostgreSQL replaced Parallel Hash + Parallel Seq Scan + Parallel Hash RIght Anti Join with Index Scan and Loop Anti Join.
The index matches the filtering by document.user_id and user.created_at, reducing shared buffer accesses from about 25k to 402 and execution time from 110 ms to 0.4 ms.

## `3.sql`
### Before
```sql

                                                          QUERY PLAN                                                          
------------------------------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..33065.33 rows=5000 width=155) (actual time=0.243..54.664 rows=946 loops=1)
   Workers Planned: 2
   Workers Launched: 2
   Buffers: shared hit=12081 read=11151
   ->  Parallel Seq Scan on documents  (cost=0.00..31565.33 rows=2083 width=155) (actual time=0.178..50.878 rows=315 loops=3)
         Filter: ((length((file_name)::text) >= 5) AND (length((file_name)::text) <= 9))
         Rows Removed by Filter: 333018
         Buffers: shared hit=12081 read=11151
 Planning:
   Buffers: shared hit=104
 Planning Time: 0.279 ms
 Execution Time: 54.744 ms
(12 rows)

```
### After
```sql

                                                                 QUERY PLAN                                                                 
--------------------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on documents  (cost=71.67..12260.43 rows=5000 width=155) (actual time=0.195..1.999 rows=946 loops=1)
   Recheck Cond: ((length((file_name)::text) >= 5) AND (length((file_name)::text) <= 9))
   Heap Blocks: exact=931
   Buffers: shared hit=934
   ->  Bitmap Index Scan on idx_document_file_name_length  (cost=0.00..70.42 rows=5000 width=0) (actual time=0.114..0.114 rows=946 loops=1)
         Index Cond: ((length((file_name)::text) >= 5) AND (length((file_name)::text) <= 9))
         Buffers: shared hit=3
 Planning:
   Buffers: shared hit=163
 Planning Time: 0.343 ms
 Execution Time: 2.068 ms
(11 rows)
```
After creating `idx_document_file_name_length`, PostgreSQL replaced Parallel Seq Scan with Bitmap Index Scan.
The index creates the bitmap based on the document name length, reducing shared buffer accesses from about 23k to 934 and execution time from 55 ms to 2 ms.

## `4.sql`
### Before
```sql
 
                                               QUERY PLAN                                               
--------------------------------------------------------------------------------------------------------
 Seq Scan on tests  (cost=0.00..3683.56 rows=625 width=53) (actual time=0.022..14.329 rows=614 loops=1)
   Filter: (search_vector @@ '''основи'' & ''docker'''::tsquery)
   Rows Removed by Filter: 99386
   Buffers: shared hit=2432
 Planning:
   Buffers: shared hit=106
 Planning Time: 0.360 ms
 Execution Time: 14.366 ms
(8 rows)
```
### After
```sql

                                                             QUERY PLAN                                                              
-------------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on tests  (cost=24.76..1456.90 rows=625 width=53) (actual time=0.620..1.711 rows=614 loops=1)
   Recheck Cond: (search_vector @@ '''основи'' & ''docker'''::tsquery)
   Heap Blocks: exact=549
   Buffers: shared hit=561
   ->  Bitmap Index Scan on idx_tests_search_vector  (cost=0.00..24.60 rows=625 width=0) (actual time=0.570..0.570 rows=614 loops=1)
         Index Cond: (search_vector @@ '''основи'' & ''docker'''::tsquery)
         Buffers: shared hit=12
 Planning:
   Buffers: shared hit=132
 Planning Time: 0.431 ms
 Execution Time: 1.757 ms
(11 rows)
```
After creating idx_tests_search_vector, PostgreSQL replaced the Seq Scan with a Bitmap Index Scan followed by a Bitmap Heap Scan. The GIN index on the generated search_vector column allows PostgreSQL to efficiently find matching lexemes for the full-text search condition instead of scanning all rows, reducing shared buffer accesses from 2432 to 561 and execution time from about 14 ms to 1.7 ms.

---

## Morphology
```sql
                                                           QUERY PLAN                                                            
---------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on tests  (cost=21.51..44.71 rows=6 width=53) (actual time=0.062..0.062 rows=0 loops=1)
   Recheck Cond: (search_vector @@ '''основами'' & ''docker'''::tsquery)
   Buffers: shared hit=7
   ->  Bitmap Index Scan on idx_tests_search_vector  (cost=0.00..21.51 rows=6 width=0) (actual time=0.059..0.059 rows=0 loops=1)
         Index Cond: (search_vector @@ '''основами'' & ''docker'''::tsquery)
         Buffers: shared hit=7
 Planning:
   Buffers: shared hit=132
 Planning Time: 0.549 ms
 Execution Time: 0.089 ms
(10 rows)

➜  api_design
```
The `simple` configuration in `plainto_tsquery` does not perform stemming, so Ukrainian word forms such as основи and основами are treated as different lexemes. As a result, the query returns no rows even though the GIN index is used correctly. PostgreSQL does not provide a built-in Ukrainian stemmer, while using another language configuration such as russian is not a reliable solution for Ukrainian morphology. Additionally, the same text-search configuration should be used when generating both the tsvector and the tsquery.