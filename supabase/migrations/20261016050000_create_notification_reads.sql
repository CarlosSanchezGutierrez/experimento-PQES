-- HU-17: estado de lectura individual de pendientes derivados.
create table if not exists public.vera_notification_reads (
  id text primary key,
  user_id bigint not null references public.vera_users(id),
  payload jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vera_notification_reads_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint vera_notification_reads_id_matches check (payload ->> 'id' = id),
  constraint vera_notification_reads_user_matches check ((payload ->> 'userId')::bigint = user_id)
);
create index if not exists vera_notification_reads_user_idx on public.vera_notification_reads(user_id);
alter table public.vera_notification_reads enable row level security;
revoke all on public.vera_notification_reads from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.vera_notification_reads to service_role;
drop trigger if exists vera_notification_reads_ledger on public.vera_notification_reads;
create trigger vera_notification_reads_ledger after insert or update or delete on public.vera_notification_reads
  for each row execute function public.vera_record_database_change();
