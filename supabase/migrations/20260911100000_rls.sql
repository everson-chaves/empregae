-- =============================================================================
-- T00.4 — Row Level Security
-- Epic E00 — Fundação
--
-- Esta migration é a que separa "protótipo" de "sistema que pode receber dado
-- real de pessoa real". A anon key vai no bundle do frontend e é pública por
-- definição: quem protege os dados é exclusivamente o que está aqui.
--
-- Duas camadas, porque RLS sozinha não dá conta:
--
--   RLS   decide QUAIS LINHAS você enxerga.
--   GRANT decide QUAIS COLUNAS você enxerga.
--
-- Duas das cinco regras de privacidade do spec são de coluna, não de linha:
-- o telefone e a coordenada exata precisam sumir sem que a linha suma junto
-- (o anúncio continua público). Isso é REVOKE de coluna, não policy.
--
-- A diferença prática: com REVOKE, um `select location` escrito por engano
-- daqui a três meses recebe "permission denied" do Postgres. Com policy, ele
-- retornaria o dado.
-- =============================================================================


-- =============================================================================
-- 1. Papel de admin
-- =============================================================================
-- Tabela separada, e não uma coluna `is_admin` em profiles, de propósito:
-- profiles tem policy de UPDATE do próprio dono. Uma falha nessa policy com
-- `is_admin` na mesma linha viraria escalação de privilégio em um UPDATE.
-- Em tabela apartada, sem nenhuma policy de escrita, não existe caminho pelo
-- qual o cliente se promova.
--
-- A T09.1 (acesso restrito ao admin) herda esta estrutura.

create table public.admins (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  criado_em  timestamptz not null default now()
);

comment on table public.admins is
  'Quem é admin. Sem policy de escrita: só service_role ou SQL direto no '
  'painel inserem aqui. Evita escalação de privilégio via UPDATE de perfil.';


-- =============================================================================
-- 2. Funções auxiliares
-- =============================================================================
-- SECURITY DEFINER com `set search_path = ''`.
--
-- O DEFINER existe para quebrar recursão: a policy de `messages` precisa
-- consultar `conversations`, que também tem RLS — sem o definer, uma policy
-- chama a outra indefinidamente.
--
-- O `search_path = ''` existe porque função DEFINER roda com os privilégios
-- do dono. Sem fixar o search_path, um usuário cria uma tabela `conversations`
-- no schema dele, coloca no path, e a função passa a ler a tabela falsa com
-- privilégio de dono. Por isso todo objeto abaixo é qualificado por schema.

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.profile_id = auth.uid());
$$;

comment on function public.eh_admin is
  'Caller é admin? Usada nas policies que liberam moderação e verificação.';

create or replace function public.participa_da_conversa(id_conversa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.worker_profiles w on w.id = c.worker_profile_id
    where c.id = id_conversa
      and (c.client_id = auth.uid() or w.profile_id = auth.uid())
  );
$$;

comment on function public.participa_da_conversa is
  'Caller é um dos dois lados da conversa (cliente ou profissional).';

create or replace function public.eh_cliente_da_conversa(id_conversa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = id_conversa and c.client_id = auth.uid()
  );
$$;

-- A trava da reputação, do lado do acesso.
-- A T00.2 garantiu por constraint que não existe avaliação sem contratação.
-- Esta função garante que quem avalia é o cliente daquela contratação, e
-- somente depois de concluída. Juntas, as duas fecham o caminho.
create or replace function public.pode_avaliar(id_booking uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    join public.conversations c on c.id = b.conversation_id
    where b.id = id_booking
      and b.status = 'concluido'
      and c.client_id = auth.uid()
  );
$$;

comment on function public.pode_avaliar is
  'Caller é o cliente da contratação E ela está concluída. Complementa a '
  'trava estrutural da T00.2 (booking_id NOT NULL + UNIQUE + restrict).';


-- =============================================================================
-- 3. Privilégio de coluna — as regras que RLS não consegue expressar
-- =============================================================================
-- O Supabase concede SELECT em todas as tabelas de `public` para anon e
-- authenticated. Para restringir por coluna é preciso revogar o SELECT da
-- tabela inteira e reconceder coluna a coluna.
--
-- Efeito colateral desejável: coluna nova nasce PRIVADA. Quem adicionar um
-- campo sensível daqui pra frente precisa conceder explicitamente, em vez de
-- vazar por padrão.

-- profiles.telefone ----------------------------------------------------------
-- LGPD: o telefone só aparece depois que a conversa existe. O acesso a ele é
-- por função nomeada (seção 5), não por SELECT.
revoke select on public.profiles from anon, authenticated;
grant  select (id, nome, avatar_url, tipo, created_at, updated_at)
  on public.profiles to anon, authenticated;

-- worker_profiles.location ---------------------------------------------------
-- A coordenada exata é onde a pessoa mora. Ninguém lê essa coluna: nem o
-- público, nem o próprio dono. A busca (T03.1) roda como SECURITY DEFINER e
-- devolve `distancia_km` já calculada — nunca o ponto.
revoke select on public.worker_profiles from anon, authenticated;
grant  select (id, profile_id, descricao, preco_medio_centavos, unidade_preco,
               raio_atendimento_km, bairro, cidade, uf, ativo, verificado_ate,
               created_at, updated_at)
  on public.worker_profiles to anon, authenticated;

-- O dono precisa GRAVAR a própria coordenada (T02.5), só não lê de volta.
grant insert (location), update (location)
  on public.worker_profiles to authenticated;

-- verifications.documento_url ------------------------------------------------
-- Documento de identidade. Some para todo mundo, inclusive para quem enviou.
revoke select on public.verifications from anon, authenticated;
grant  select (id, worker_profile_id, status, tipo_documento, revisado_por,
               revisado_em, validade, observacao, created_at)
  on public.verifications to authenticated;
grant insert (documento_url) on public.verifications to authenticated;


-- =============================================================================
-- 4. RLS ligada em todas as tabelas
-- =============================================================================
-- Tabela em `public` sem RLS ligada é legível pela anon key. Ligar em todas,
-- inclusive nas que ainda não têm uso no MVP1, é o padrão seguro: nenhuma
-- tabela nasce aberta.

alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.worker_profiles   enable row level security;
alter table public.worker_categories enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.bookings          enable row level security;
alter table public.reviews           enable row level security;
alter table public.verifications     enable row level security;
alter table public.payments          enable row level security;
alter table public.boosts            enable row level security;
alter table public.admins            enable row level security;


-- =============================================================================
-- 5. Políticas
-- =============================================================================

-- admins ---------------------------------------------------------------------
-- Leitura só para admin. Nenhuma policy de escrita: inserir aqui exige
-- service_role ou SQL direto no painel. É deliberado.
create policy "admin le a lista de admins"
  on public.admins for select to authenticated
  using (public.eh_admin());

-- categories -----------------------------------------------------------------
-- Catálogo público. Escrita só admin.
create policy "catalogo de categorias e publico"
  on public.categories for select to anon, authenticated using (true);

create policy "admin gerencia categorias"
  on public.categories for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- profiles -------------------------------------------------------------------
-- O nome e o avatar são públicos (aparecem na busca e no chat). O telefone
-- não é — mas isso já foi resolvido no GRANT de coluna, então a policy aqui
-- pode liberar a linha sem risco.
create policy "perfis sao publicos, menos o telefone"
  on public.profiles for select to anon, authenticated using (true);

create policy "usuario edita o proprio perfil"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "usuario cria o proprio perfil"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- worker_profiles ------------------------------------------------------------
-- O anúncio ativo é público: é um classificado. O inativo só o dono enxerga.
create policy "anuncio ativo e publico"
  on public.worker_profiles for select to anon, authenticated
  using (ativo or profile_id = auth.uid());

create policy "profissional gerencia o proprio anuncio"
  on public.worker_profiles for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- worker_categories ----------------------------------------------------------
create policy "categorias do anuncio sao publicas"
  on public.worker_categories for select to anon, authenticated using (true);

create policy "profissional gerencia as proprias categorias"
  on public.worker_categories for all to authenticated
  using (exists (select 1 from public.worker_profiles w
                 where w.id = worker_profile_id and w.profile_id = auth.uid()))
  with check (exists (select 1 from public.worker_profiles w
                      where w.id = worker_profile_id and w.profile_id = auth.uid()));

-- conversations --------------------------------------------------------------
create policy "so os dois lados veem a conversa"
  on public.conversations for select to authenticated
  using (public.participa_da_conversa(id) or public.eh_admin());

-- Quem abre conversa é o cliente, e só em nome próprio.
create policy "cliente abre a conversa"
  on public.conversations for insert to authenticated
  with check (client_id = auth.uid());

-- messages -------------------------------------------------------------------
-- A regra mais sensível do produto: conversa é privada entre duas pessoas.
create policy "so os dois lados leem as mensagens"
  on public.messages for select to authenticated
  using (public.participa_da_conversa(conversation_id));

create policy "so participante envia mensagem"
  on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.participa_da_conversa(conversation_id));

-- Marcar como lida (T04.4). Só quem recebeu, nunca quem enviou.
create policy "destinatario marca como lida"
  on public.messages for update to authenticated
  using (public.participa_da_conversa(conversation_id) and sender_id <> auth.uid())
  with check (public.participa_da_conversa(conversation_id) and sender_id <> auth.uid());

-- Mensagem não se apaga: é o registro que sustenta a avaliação verificada.
-- Ausência de policy de DELETE já é a proibição.

-- bookings -------------------------------------------------------------------
create policy "so os dois lados veem a contratacao"
  on public.bookings for select to authenticated
  using (public.participa_da_conversa(conversation_id) or public.eh_admin());

create policy "participante propoe contratacao"
  on public.bookings for insert to authenticated
  with check (public.participa_da_conversa(conversation_id));

create policy "participante atualiza a contratacao"
  on public.bookings for update to authenticated
  using (public.participa_da_conversa(conversation_id))
  with check (public.participa_da_conversa(conversation_id));

-- reviews --------------------------------------------------------------------
-- Reputação é pública: é para isso que ela existe.
create policy "avaliacoes sao publicas"
  on public.reviews for select to anon, authenticated using (true);

-- A trava. Três condições simultâneas: é você o autor, você é o cliente
-- daquela contratação, e ela está concluída.
create policy "so o cliente avalia, e so apos concluir"
  on public.reviews for insert to authenticated
  with check (autor_id = auth.uid() and public.pode_avaliar(booking_id));

-- Sem UPDATE e sem DELETE para o usuário: avaliação publicada é imutável.
-- Conteúdo abusivo é tratado por moderação (T09.3), não por edição.
create policy "admin modera avaliacoes"
  on public.reviews for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- verifications --------------------------------------------------------------
create policy "profissional ve a propria verificacao"
  on public.verifications for select to authenticated
  using (exists (select 1 from public.worker_profiles w
                 where w.id = worker_profile_id and w.profile_id = auth.uid())
         or public.eh_admin());

create policy "profissional solicita a propria verificacao"
  on public.verifications for insert to authenticated
  with check (exists (select 1 from public.worker_profiles w
                      where w.id = worker_profile_id and w.profile_id = auth.uid())
              and status = 'pendente');

-- Só admin decide. O profissional não aprova a própria verificação.
create policy "admin decide a verificacao"
  on public.verifications for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- payments e boosts ----------------------------------------------------------
-- Leitura do que é seu. Escrita é exclusiva do servidor (service_role, que
-- ignora RLS): quem confirma pagamento é o webhook do provedor, nunca o
-- cliente — senão qualquer um marca a própria cobrança como paga.
create policy "usuario ve os proprios pagamentos"
  on public.payments for select to authenticated
  using (profile_id = auth.uid() or public.eh_admin());

create policy "boosts sao publicos"
  on public.boosts for select to anon, authenticated using (true);


-- =============================================================================
-- 6. As portas estreitas para o telefone
-- =============================================================================
-- O SELECT da coluna foi revogado. O acesso legítimo passa por estas duas
-- funções, cada uma com sua condição explícita.

create or replace function public.meu_telefone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.telefone from public.profiles p where p.id = auth.uid();
$$;

comment on function public.meu_telefone is
  'O próprio telefone do caller. Existe porque o SELECT da coluna é revogado.';

create or replace function public.telefone_do_par(id_conversa uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.participa_da_conversa(id_conversa) then null
    else (
      select p.telefone
      from public.conversations c
      join public.worker_profiles w on w.id = c.worker_profile_id
      join public.profiles p
        on p.id = case when c.client_id = auth.uid() then w.profile_id else c.client_id end
      where c.id = id_conversa
    )
  end;
$$;

comment on function public.telefone_do_par is
  'Telefone do outro lado da conversa. Retorna NULL se o caller não participa '
  'dela. É a materialização da regra "telefone só após conversa iniciada".';

revoke execute on function public.meu_telefone()            from anon;
revoke execute on function public.telefone_do_par(uuid)     from anon;
