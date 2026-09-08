-- Migración: agrupación de casas + datos para plantilla de contrato
-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase
-- (https://app.supabase.com -> tu proyecto -> SQL Editor -> New query -> pegar y ejecutar)

-- 1. Agrupar inmuebles bajo una "casa" madre (ej: "Casa de fernando" agrupa "interior" y "exterior")
alter table public.casas
  add column if not exists grupo text;

create index if not exists casas_grupo_idx on public.casas (grupo);

-- 2. Datos adicionales del contrato para poder generar el PDF con la plantilla legal
alter table public.contratos
  add column if not exists arrendatario_dni text,
  add column if not exists arrendatario_domicilio text,
  add column if not exists direccion_inmueble text,
  add column if not exists dia_pago_mensual text,
  add column if not exists meses_adelantados text,
  add column if not exists monto_adelanto text,
  add column if not exists fecha_pago_adelanto date,
  add column if not exists monto_garantia text,
  add column if not exists fecha_pago_garantia date,
  add column if not exists duracion_contrato text,
  add column if not exists clausulas_adicionales text;
