-- HU-15: hallazgos ligados a una evaluacion insuficiente de control y a un riesgo.
create table if not exists public.vera_findings (
  id text primary key,
  control_id text not null references public.vera_controls(id),
  risk_id text not null references public.vera_risks(id),
  payload jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vera_findings_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint vera_findings_id_matches check (payload ->> 'id' = id),
  constraint vera_findings_control_matches check (payload ->> 'controlId' = control_id),
  constraint vera_findings_risk_matches check (payload ->> 'riskId' = risk_id)
);
create index if not exists vera_findings_control_idx on public.vera_findings(control_id);
create index if not exists vera_findings_risk_idx on public.vera_findings(risk_id);
create unique index if not exists vera_findings_evaluation_key
  on public.vera_findings(control_id, risk_id, (payload ->> 'evaluationVersion'));
alter table public.vera_findings enable row level security;
revoke all on public.vera_findings from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.vera_findings to service_role;
drop trigger if exists vera_findings_ledger on public.vera_findings;
create trigger vera_findings_ledger after insert or update or delete on public.vera_findings
  for each row execute function public.vera_record_database_change();
