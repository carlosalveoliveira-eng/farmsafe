begin;

-- =========================================================
-- 003 - Convite seguro de usuários
-- =========================================================

-- Normaliza e-mail dos usuários existentes
update farmsafe.usuarios
set email = lower(trim(email))
where email is not null;

-- Garante 1 perfil por usuário Auth
create unique index if not exists usuarios_auth_user_id_unico
on farmsafe.usuarios(auth_user_id);

-- Garante que não exista e-mail repetido dentro da mesma empresa
create unique index if not exists usuarios_empresa_email_unico
on farmsafe.usuarios(empresa_id, lower(email))
where email is not null;

commit;