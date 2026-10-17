-- Búsqueda de fragmentos ya indexados. La API entrega únicamente IDs de
-- evidencias que el usuario puede leer; la función solo acepta service_role.
create index if not exists vera_evidence_text_chunks_spanish_idx
  on public.vera_evidence_text_chunks
  using gin (to_tsvector('spanish', content));

create or replace function public.vera_search_evidence_text_chunks(
  p_evidence_ids text[], p_query text, p_limit integer default 5
)
returns table (evidence_id text, chunk_index integer, page_number integer, content text, score real)
language sql stable security invoker set search_path = public
as $$
  select c.evidence_id, c.chunk_index, c.page_number, c.content,
    ts_rank_cd(to_tsvector('spanish', c.content), plainto_tsquery('spanish', left(p_query, 500)))::real as score
  from public.vera_evidence_text_chunks as c
  where c.evidence_id = any(p_evidence_ids)
    and to_tsvector('spanish', c.content) @@ plainto_tsquery('spanish', left(p_query, 500))
  order by score desc, c.evidence_id, c.chunk_index
  limit least(greatest(p_limit, 1), 5);
$$;

revoke all on function public.vera_search_evidence_text_chunks(text[], text, integer) from public, anon, authenticated;
grant execute on function public.vera_search_evidence_text_chunks(text[], text, integer) to service_role;
