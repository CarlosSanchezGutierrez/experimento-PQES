-- Ejecutar una sola vez en el SQL Editor del proyecto Supabase de VERA.
-- Solo la API Express usa esta tabla con una clave secreta de servidor.
create table if not exists public.vera_audit_proposals (
  id text primary key,
  payload jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vera_audit_proposals_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint vera_audit_proposals_id_matches check (payload ->> 'id' = id),
  constraint vera_audit_proposals_status_valid check (
    payload ->> 'status' in ('OPEN', 'APPROVED', 'ACTIVE', 'CLOSED', 'REJECTED')
  )
);

-- Evita duplicados incluso si dos personas crean la misma propuesta a la vez.
create unique index if not exists vera_audit_proposals_business_key
  on public.vera_audit_proposals (
    lower(btrim(payload ->> 'title')),
    lower(btrim(payload ->> 'area')),
    (payload ->> 'year')
  );

create index if not exists vera_audit_proposals_status_idx
  on public.vera_audit_proposals ((payload ->> 'status'));

alter table public.vera_audit_proposals enable row level security;
revoke all on public.vera_audit_proposals from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.vera_audit_proposals to service_role;
