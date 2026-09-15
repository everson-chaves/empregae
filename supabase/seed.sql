-- =============================================================================
-- T00.5 — Seed de desenvolvimento
-- Epic E00 — Fundação
--
-- Rodado automaticamente pelo `npm run db:reset`. É a massa que os quatro
-- devs usam para trabalhar em paralelo: quem constrói o chat precisa de
-- conversas existindo, quem constrói a busca precisa de densidade real.
--
-- SENHA DE TODOS OS USUÁRIOS DO SEED: empregae123
--
-- Geografia: Campo Grande - MS, nos quatro bairros que o protótipo já usa
-- (Jardim Panamá, Popular, Santo Amaro e Ana Maria do Couto). A praça-piloto
-- ainda é questão em aberto do spec — quando o grupo decidir, é aqui que se
-- troca. Os 20 perfis ficam dentro de ~5 km de um centro comum, que é
-- exatamente o raio da meta de liquidez do piloto.
-- =============================================================================

-- Trava de segurança e limpeza -----------------------------------------------
-- Este arquivo só pode tocar em banco de desenvolvimento. Se houver qualquer
-- usuário que não seja do seed, aborta: é sinal de dado real.
--
-- A verificação e os DELETE moram no MESMO bloco DO de propósito. Um bloco DO
-- é uma única instrução e roda atomicamente: se a exceção dispara, nenhum
-- DELETE acontece.
--
-- Separados, não seria assim. O psql sem ON_ERROR_STOP continua executando
-- depois de um erro — a exceção apareceria na tela e os DELETE rodariam logo
-- em seguida, apagando exatamente o dado real que a trava deveria proteger.
-- Foi o que aconteceu na primeira versão deste arquivo.
do $$
begin
  if exists (select 1 from auth.users where email not like '%@empregae.local') then
    raise exception
      'SEED ABORTADO: existe usuario que nao e do seed. Este arquivo e so para '
      'ambiente de desenvolvimento e nunca deve rodar em banco com dado real.';
  end if;

  -- Ordem importa: worker_categories tem FK com on delete RESTRICT para
  -- categories. Apagar os usuários primeiro cascateia até worker_categories e
  -- libera as categorias; o inverso falha.
  delete from auth.users where email like '%@empregae.local';
  delete from public.categories;
end $$;


-- =============================================================================
-- Categorias
-- =============================================================================
-- As 50 do protótipo, preservadas conforme o spec. O slug é derivado do nome
-- para não haver divergência entre os dois.

insert into public.categories (slug, nome, icone, ordem)
select
  trim(both '-' from regexp_replace(
    lower(translate(nome,
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
    '[^a-z0-9]+', '-', 'g')),
  nome, icone, ordem
from (values
  ('Diarista','🧹',1), ('Faxineira','🧽',2), ('Passadeira','👔',3),
  ('Cozinheira','🍲',4), ('Cuidadora','🤝',5), ('Babá','🍼',6),
  ('Eletricista','⚡',7), ('Encanador','🔧',8), ('Pintor','🎨',9),
  ('Pedreiro','🧱',10), ('Marido de aluguel','🛠️',11), ('Montador de móveis','🪑',12),
  ('Jardineiro','🌱',13), ('Piscineiro','🏊',14), ('Costureira','🧵',15),
  ('Manicure','💅',16), ('Cabeleireira','💇',17), ('Barbeiro','💈',18),
  ('Maquiadora','💄',19), ('Depiladora','🪒',20), ('Massagista','💆',21),
  ('Personal trainer','🏋️',22), ('Professor particular','📚',23), ('Reforço escolar','✏️',24),
  ('Aulas de música','🎸',25), ('Motorista','🚗',26), ('Motoboy','🏍️',27),
  ('Entregador','📦',28), ('Carreteiro','🚛',29), ('Mudanças','🚚',30),
  ('Frete pequeno','🚐',31), ('Lavador de carros','🚿',32), ('Mecânico','🔩',33),
  ('Borracheiro','🛞',34), ('Técnico de celular','📱',35), ('Técnico de computador','💻',36),
  ('Instalador de internet','📡',37), ('Instalador de câmera','📹',38), ('Chaveiro','🔑',39),
  ('Vidraceiro','🪟',40), ('Serralheiro','⚙️',41), ('Soldador','🔥',42),
  ('Gesseiro','🏗️',43), ('Marceneiro','🪵',44), ('Tapeceiro','🛋️',45),
  ('Lavanderia','🧺',46), ('Pet sitter','🐾',47), ('Passeador de cães','🐕',48),
  ('Cuidador de quintal','🌳',49), ('Auxiliar de eventos','🎉',50)
) as t(nome, icone, ordem);


-- =============================================================================
-- Pessoas
-- =============================================================================

create temp table _seed_pessoas (
  idx        int,
  papel      text,          -- 'profissional' | 'cliente' | 'admin'
  nome       text,
  telefone   text,
  bairro     text,
  lat        double precision,
  lon        double precision,
  categoria  text,          -- slug
  preco      int,
  unidade    unidade_preco,
  descricao  text,
  verificado boolean
);

insert into _seed_pessoas values
-- 20 profissionais -----------------------------------------------------------
( 1,'profissional','Maria das Graças Silva','67991110001','Jardim Panamá',-20.4686,-54.6639,'diarista',      12000,'diaria', 'Faço limpeza completa de casas e apartamentos. Trabalho com produtos próprios e atendo a região há 12 anos.', true),
( 2,'profissional','José Carlos Ferreira','67991110002','Jardim Panamá',-20.4652,-54.6601,'eletricista',    9000,'hora',   'Eletricista residencial e predial. Instalação de chuveiro, tomada, disjuntor e troca de fiação. Atendo emergência.', true),
( 3,'profissional','Ana Lúcia Moraes','67991110003','Jardim Panamá',-20.4710,-54.6672,'passadeira',        8000,'diaria', 'Passo roupa social, uniforme e peça delicada. Retiro e devolvo na sua casa sem custo dentro do bairro.', false),
( 4,'profissional','Sebastião Nunes','67991110004','Jardim Panamá',-20.4665,-54.6690,'pedreiro',          18000,'diaria', 'Alvenaria, reboco, contrapiso e assentamento de piso. Faço orçamento sem compromisso.', false),
( 5,'profissional','Rosângela Pereira','67991110005','Jardim Panamá',-20.4700,-54.6615,'cozinheira',      15000,'diaria', 'Cozinho comida caseira para família e evento pequeno. Marmita congelada sob encomenda.', false),
( 6,'profissional','Antônio Batista','67991110006','Popular',        -20.4329,-54.6221,'encanador',         9500,'hora',   'Conserto vazamento, desentupimento e troca de registro. Localizo vazamento sem quebrar tudo.', true),
( 7,'profissional','Fernanda Alves','67991110007','Popular',         -20.4295,-54.6250,'manicure',          5000,'servico','Manicure e pedicure em domicílio. Esmaltação em gel e fibra. Levo todo o material esterilizado.', false),
( 8,'profissional','Paulo Henrique Dias','67991110008','Popular',    -20.4360,-54.6198,'pintor',           14000,'diaria', 'Pintura interna e externa, textura e grafiato. Protejo móvel e piso antes de começar.', true),
( 9,'profissional','Cleide Santana','67991110009','Popular',         -20.4310,-54.6265,'cuidadora',        16000,'diaria', 'Cuidadora de idoso com curso técnico. Acompanho consulta, administro medicação e faço relatório diário.', true),
(10,'profissional','Marcos Vinícius Rocha','67991110010','Popular',  -20.4345,-54.6235,'montador-de-moveis',7000,'hora',   'Monto e desmonto móvel de qualquer loja. Tenho ferramenta completa e faço no mesmo dia.', false),
(11,'profissional','Luciana Barbosa','67991110011','Santo Amaro',    -20.4356,-54.6518,'cabeleireira',      6000,'servico','Corte, escova, coloração e progressiva. Atendo em domicílio na região.', false),
(12,'profissional','Roberto Carvalho','67991110012','Santo Amaro',   -20.4390,-54.6540,'marido-de-aluguel', 8500,'hora',   'Pequenos reparos: prateleira, varal, torneira, fechadura, quadro. Resolvo o que ninguém quer fazer.', true),
(13,'profissional','Débora Cristina Lima','67991110013','Santo Amaro',-20.4325,-54.6495,'baba',            11000,'diaria', 'Babá com experiência em recém-nascido. Referência das famílias que atendo há 6 anos.', true),
(14,'profissional','Wilson Tadeu Souza','67991110014','Santo Amaro', -20.4372,-54.6555,'jardineiro',        9000,'diaria', 'Poda, corte de grama, plantio e limpeza de quintal. Levo o entulho embora.', false),
(15,'profissional','Patrícia Gomes','67991110015','Santo Amaro',     -20.4340,-54.6480,'costureira',        4500,'servico','Ajuste de roupa, barra, zíper e reforma de peça. Costuro sob medida também.', false),
(16,'profissional','Edson Ribeiro','67991110016','Ana Maria do Couto',-20.4014,-54.6129,'tecnico-de-celular',7000,'servico','Troca de tela, bateria e conector de carga. Orçamento na hora e garantia de 90 dias.', false),
(17,'profissional','Vanessa Martins','67991110017','Ana Maria do Couto',-20.4045,-54.6160,'faxineira',     11000,'diaria', 'Faxina pesada, pós-obra e limpeza de fim de contrato. Trabalho em dupla quando o serviço é grande.', false),
(18,'profissional','Gilberto Andrade','67991110018','Ana Maria do Couto',-20.3985,-54.6100,'chaveiro',      6500,'servico','Abertura de porta, troca de segredo e cópia de chave. Atendo 24h para emergência.', true),
(19,'profissional','Simone Aparecida Costa','67991110019','Ana Maria do Couto',-20.4030,-54.6175,'professor-particular',5500,'hora','Reforço de matemática e português do fundamental ao médio. Preparo para prova e recuperação.', false),
(20,'profissional','Nilson Teixeira','67991110020','Ana Maria do Couto',-20.4000,-54.6145,'motoboy',        3500,'servico','Entrega rápida e pequeno frete na cidade toda. Levo documento, encomenda e remédio.', false),
-- 4 clientes -----------------------------------------------------------------
(21,'cliente','Juliana Prado',      '67992220001','Popular',      null,null,null,null,null,null,false),
(22,'cliente','Ricardo Menezes',    '67992220002','Santo Amaro',  null,null,null,null,null,null,false),
(23,'cliente','Camila Figueiredo',  '67992220003','Jardim Panamá',null,null,null,null,null,null,false),
(24,'cliente','Eduardo Sampaio',    '67992220004','Ana Maria do Couto',null,null,null,null,null,null,false),
-- 1 admin --------------------------------------------------------------------
(25,'admin','Equipe Empregaê',      '67993330001',null,          null,null,null,null,null,null,false);

-- auth.users -----------------------------------------------------------------
-- Os campos de token vão como string vazia, e não NULL: o GoTrue rejeita NULL
-- em alguns deles e o login falha com erro pouco descritivo.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  ('00000000-0000-4000-8000-' || lpad(idx::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  case papel
    when 'admin' then 'admin@empregae.local'
    else lower(translate(split_part(nome,' ',1),'áàâãéêíóôõúçÁÂÃÉÊÍÓÔÕÚÇ','aaaaeeiooucAAAEEIOOUC'))
         || idx || '@empregae.local'
  end,
  extensions.crypt('empregae123', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('nome', nome),
  '', '', '', ''
from _seed_pessoas;

-- profiles -------------------------------------------------------------------
insert into public.profiles (id, nome, telefone, tipo)
select ('00000000-0000-4000-8000-' || lpad(idx::text, 12, '0'))::uuid,
       nome, telefone,
       case papel when 'profissional' then 'profissional'::tipo_perfil
                  else 'cliente'::tipo_perfil end
from _seed_pessoas;

-- admin ----------------------------------------------------------------------
insert into public.admins (profile_id)
select ('00000000-0000-4000-8000-' || lpad(idx::text, 12, '0'))::uuid
from _seed_pessoas where papel = 'admin';

-- worker_profiles ------------------------------------------------------------
insert into public.worker_profiles (
  id, profile_id, descricao, preco_medio_centavos, unidade_preco,
  raio_atendimento_km, location, bairro, cidade, uf, ativo, verificado_ate
)
select
  ('00000000-0000-4000-9000-' || lpad(idx::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad(idx::text, 12, '0'))::uuid,
  descricao, preco, unidade,
  case when idx % 3 = 0 then 10 else 5 end,
  extensions.ST_SetSRID(extensions.ST_MakePoint(lon, lat), 4326)::extensions.geography,
  bairro, 'Campo Grande', 'MS',
  true,
  case when verificado then current_date + 300 else null end
from _seed_pessoas where papel = 'profissional';

-- worker_categories ----------------------------------------------------------
-- Categoria principal de cada um, mais uma secundária para quem tem índice
-- par — assim a busca por categoria devolve resultado variado.
insert into public.worker_categories (worker_profile_id, category_id)
select ('00000000-0000-4000-9000-' || lpad(p.idx::text, 12, '0'))::uuid, c.id
from _seed_pessoas p
join public.categories c on c.slug = p.categoria
where p.papel = 'profissional';

insert into public.worker_categories (worker_profile_id, category_id)
select ('00000000-0000-4000-9000-' || lpad(p.idx::text, 12, '0'))::uuid, c.id
from _seed_pessoas p
join public.categories c on c.ordem = ((p.idx * 7) % 50) + 1
where p.papel = 'profissional'
  and p.idx % 2 = 0
  and c.slug <> p.categoria;


-- =============================================================================
-- Atividade: conversas, contratações e avaliações
-- =============================================================================
-- Vai além da letra da T00.5 (que pede categorias e perfis), de propósito:
-- sem conversa existindo, quem constrói o chat na E04 não tem contra o que
-- trabalhar, e sem contratação concluída a avaliação da E06 não pode ser
-- exercitada. Volume pequeno, só o suficiente para desenvolver.

-- Juliana (21) contratou Maria das Graças (1) — ciclo completo, com avaliação.
insert into public.conversations (id, client_id, worker_profile_id, briefing) values
('00000000-0000-4000-a000-000000000001',
 '00000000-0000-4000-8000-000000000021',
 '00000000-0000-4000-9000-000000000001',
 '{"comodos":"3 quartos, 2 banheiros","frequencia":"semanal","tem_animal":true}'::jsonb);

insert into public.messages (conversation_id, sender_id, body, created_at, read_at) values
('00000000-0000-4000-a000-000000000001','00000000-0000-4000-8000-000000000021','Oi Maria, tudo bem? Preciso de faxina semanal, casa de 3 quartos.', now() - interval '5 days', now() - interval '5 days'),
('00000000-0000-4000-a000-000000000001','00000000-0000-4000-8000-000000000001','Bom dia! Tudo sim. Trabalho na quarta e na sexta, qual fica melhor?',  now() - interval '5 days', now() - interval '5 days'),
('00000000-0000-4000-a000-000000000001','00000000-0000-4000-8000-000000000021','Quarta é ótimo. Pode ser essa semana?',                                now() - interval '4 days', now() - interval '4 days');

insert into public.bookings (id, conversation_id, status, valor_combinado_centavos, data_servico, concluido_em, concluido_por) values
('00000000-0000-4000-b000-000000000001','00000000-0000-4000-a000-000000000001','concluido',12000, current_date - 2, now() - interval '2 days','00000000-0000-4000-8000-000000000021');

insert into public.reviews (booking_id, autor_id, nota, comentario) values
('00000000-0000-4000-b000-000000000001','00000000-0000-4000-8000-000000000021',5,'Maria é excelente. Caprichosa, pontual e muito atenciosa. Já agendei a próxima.');

-- Ricardo (22) e Antônio (6) — contratação aceita, ainda não concluída.
insert into public.conversations (id, client_id, worker_profile_id, briefing) values
('00000000-0000-4000-a000-000000000002',
 '00000000-0000-4000-8000-000000000022',
 '00000000-0000-4000-9000-000000000006',
 '{"problema":"vazamento embaixo da pia","urgencia":"alta"}'::jsonb);

insert into public.messages (conversation_id, sender_id, body, created_at) values
('00000000-0000-4000-a000-000000000002','00000000-0000-4000-8000-000000000022','Boa tarde, tem um vazamento embaixo da pia da cozinha.', now() - interval '1 day'),
('00000000-0000-4000-a000-000000000002','00000000-0000-4000-8000-000000000006','Boa tarde! Consigo passar amanhã de manhã pra avaliar.',  now() - interval '1 day');

insert into public.bookings (conversation_id, status, valor_combinado_centavos, data_servico) values
('00000000-0000-4000-a000-000000000002','aceito', 9500, current_date + 1);

-- Camila (23) e Ana Lúcia (3) — conversa nova, sem resposta ainda.
-- Alimenta o teste do lembrete de mensagem não respondida (T08.5).
insert into public.conversations (id, client_id, worker_profile_id, briefing) values
('00000000-0000-4000-a000-000000000003',
 '00000000-0000-4000-8000-000000000023',
 '00000000-0000-4000-9000-000000000003',
 '{"pecas":"cerca de 20 camisas sociais","retirada":true}'::jsonb);

insert into public.messages (conversation_id, sender_id, body, created_at) values
('00000000-0000-4000-a000-000000000003','00000000-0000-4000-8000-000000000023','Oi! Você passa camisa social? São umas 20 peças por semana.', now() - interval '30 hours');

-- Fila de verificação para o painel admin (T09.2) exercitar.
insert into public.verifications (worker_profile_id, status, documento_url, tipo_documento) values
('00000000-0000-4000-9000-000000000004','pendente','seed://documento-exemplo-04.jpg','rg'),
('00000000-0000-4000-9000-000000000007','pendente','seed://documento-exemplo-07.jpg','cnh');

-- Fim ------------------------------------------------------------------------
drop table if exists _seed_pessoas;
