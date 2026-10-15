-- Ejecutar en el SQL Editor de Supabase después de las migraciones 001 y 002.
-- La app no tiene autenticación: las políticas anon habilitan cargas y lecturas
-- para mantener el flujo actual, por lo que los documentos no tienen control
-- de acceso por usuario aunque el bucket no sea público.
--
-- Características y fotos de casas y departamentos.
alter table public.casas
  add column if not exists caracteristicas jsonb not null default '{}'::jsonb,
  add column if not exists fotos text[] not null default '{}'::text[];

-- Datos completos del inquilino y su cónyuge/pareja.
alter table public.contratos
  add column if not exists nombres_completos text,
  add column if not exists apellidos_completos text,
  add column if not exists tiene_pareja boolean not null default false,
  add column if not exists conyuge_nombres text,
  add column if not exists conyuge_apellidos text,
  add column if not exists conyuge_dni text,
  add column if not exists conyuge_dni_frontal_path text,
  add column if not exists conyuge_dni_trasero_path text;

-- Fotos de propiedades de acceso público y documentos personales en bucket privado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-images', 'property-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('tenant-documents', 'tenant-documents', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Permitir fotos de propiedades anon" on storage.objects;
create policy "Permitir fotos de propiedades anon"
  on storage.objects for all to anon
  using (bucket_id = 'property-images')
  with check (bucket_id = 'property-images');

drop policy if exists "Permitir documentos de inquilinos anon" on storage.objects;
create policy "Permitir documentos de inquilinos anon"
  on storage.objects for all to anon
  using (bucket_id = 'tenant-documents')
  with check (bucket_id = 'tenant-documents');
