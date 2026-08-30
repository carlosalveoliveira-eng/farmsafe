set search_path = farmsafe, public;

alter table farmsafe.cochos
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists map_area_id uuid references farmsafe.map_areas(id) on delete set null;

alter table farmsafe.lotes
  add column if not exists map_area_id uuid references farmsafe.map_areas(id) on delete set null;

create table if not exists farmsafe.lote_map_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references farmsafe.empresas(id),
  fazenda_id uuid not null references farmsafe.fazendas(id),
  lote_id uuid not null references farmsafe.lotes(id),
  map_area_origem_id uuid references farmsafe.map_areas(id) on delete set null,
  map_area_destino_id uuid references farmsafe.map_areas(id) on delete set null,
  moved_by uuid references auth.users(id),
  moved_at timestamptz not null default now(),
  observacao text
);

alter table farmsafe.lote_map_movimentacoes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'farmsafe'
      and tablename = 'lote_map_movimentacoes'
      and policyname = 'lote_map_movimentacoes_select'
  ) then
    create policy lote_map_movimentacoes_select
      on farmsafe.lote_map_movimentacoes
      for select
      to authenticated
      using (empresa_id = farmsafe.get_empresa_id());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'farmsafe'
      and tablename = 'lote_map_movimentacoes'
      and policyname = 'lote_map_movimentacoes_insert'
  ) then
    create policy lote_map_movimentacoes_insert
      on farmsafe.lote_map_movimentacoes
      for insert
      to authenticated
      with check (empresa_id = farmsafe.get_empresa_id());
  end if;
end
$$;

grant select, insert on farmsafe.lote_map_movimentacoes to authenticated;

create index if not exists idx_cochos_map_area_id
  on farmsafe.cochos(map_area_id);

create index if not exists idx_cochos_geo_operacional
  on farmsafe.cochos(fazenda_id, latitude, longitude)
  where latitude is not null and longitude is not null;

create index if not exists idx_lotes_map_area_id
  on farmsafe.lotes(map_area_id);

create index if not exists idx_lote_map_movimentacoes_lote
  on farmsafe.lote_map_movimentacoes(lote_id, moved_at desc);

comment on column farmsafe.cochos.latitude is
  'Latitude operacional opcional definida pelo gestor no mapa.';

comment on column farmsafe.cochos.longitude is
  'Longitude operacional opcional definida pelo gestor no mapa.';

comment on column farmsafe.cochos.map_area_id is
  'Area/pasto onde o cocho foi posicionado no mapa operacional.';

comment on column farmsafe.lotes.map_area_id is
  'Area/pasto atual do lote no mapa operacional.';

comment on table farmsafe.lote_map_movimentacoes is
  'Historico de movimentacoes de lotes entre areas/pastos pelo mapa operacional.';
