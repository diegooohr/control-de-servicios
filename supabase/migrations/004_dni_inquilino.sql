-- Fotos del DNI del titular (cara delantera y trasera).
alter table public.contratos
  add column if not exists arrendatario_dni_frontal_path text,
  add column if not exists arrendatario_dni_trasero_path text;
