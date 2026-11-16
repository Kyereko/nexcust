-- Pin the search path of the append-only guard so it cannot be redirected by a caller's search_path
-- (Supabase security advisor 0011_function_search_path_mutable). The function only raises an error.
ALTER FUNCTION j1_block_mutation() SET search_path = pg_catalog;
