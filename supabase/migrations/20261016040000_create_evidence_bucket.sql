-- HU-16: archivos privados; las referencias y metadatos siguen en vera_evidence.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vera-evidence', 'vera-evidence', false, 3145728,
        array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
