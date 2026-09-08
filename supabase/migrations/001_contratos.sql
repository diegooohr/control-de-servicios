-- Migración: tabla "contratos"
-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase
-- (https://app.supabase.com -> tu proyecto -> SQL Editor -> New query -> pegar y ejecutar)

create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references public.casas(id) on delete cascade,
  inquilino text not null,
  telefono text,
  fecha_inicio date not null,
  fecha_fin date,
  monto_alquiler numeric(10, 2),
  observaciones text,
  estado text not null default 'activo' check (estado in ('activo', 'finalizado')),
  created_at timestamptz not null default now()
);

create index if not exists contratos_casa_id_idx on public.contratos (casa_id);
create index if not exists contratos_estado_idx on public.contratos (estado);
create index if not exists contratos_fecha_fin_idx on public.contratos (fecha_fin);

-- Habilita RLS y una policy abierta (ajusta según tus necesidades de seguridad,
-- igual que el resto de tablas del proyecto que usan la clave anónima).
alter table public.contratos enable row level security;

drop policy if exists "Permitir todo a anon" on public.contratos;
create policy "Permitir todo a anon"
  on public.contratos
  for all
  to anon
  using (true)
  with check (true);
