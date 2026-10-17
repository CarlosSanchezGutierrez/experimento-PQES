-- Minimal, content-free feedback. Only the server service role may read/write.
create table if not exists public.vera_ai_feedback (
  interaction_id uuid primary key,
  channel text not null check (channel in ('ask', 'evidence-search')),
  response_mode text not null check (char_length(response_mode) between 1 and 32),
  rating text not null check (rating in ('helpful', 'unhelpful')),
  created_at timestamptz not null default now()
);
create index if not exists vera_ai_feedback_created_at_idx on public.vera_ai_feedback (created_at desc);
alter table public.vera_ai_feedback enable row level security;
revoke all on public.vera_ai_feedback from public, anon, authenticated;
grant select, insert on public.vera_ai_feedback to service_role;
