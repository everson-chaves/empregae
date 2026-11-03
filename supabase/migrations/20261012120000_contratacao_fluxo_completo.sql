-- =============================================================================
-- T05.1-T05.4 — Fluxo completo da contratação (propor, aceitar/recusar,
-- confirmar conclusão dos dois lados, cancelar)
-- Epic E05 — Registro de contratação
--
-- A T00.2 já criou `bookings` com o essencial (status, valor, data,
-- concluido_em/concluido_por). Esta migration acrescenta só o que faltava
-- para o ciclo completo: quem propôs, a confirmação dos DOIS lados (T05.3
-- pede "confirmação dos dois lados", não um clique só), e o motivo/autor do
-- cancelamento (T05.4).
-- =============================================================================

alter table public.bookings
  add column proposto_por uuid references public.profiles (id) on delete set null,
  add column confirmado_cliente_em timestamptz,
  add column confirmado_profissional_em timestamptz,
  add column cancelado_por uuid references public.profiles (id) on delete set null,
  add column motivo_cancelamento text
    check (motivo_cancelamento is null or length(btrim(motivo_cancelamento)) between 1 and 500);

comment on column public.bookings.proposto_por is
  'Quem fez a proposta inicial (T05.1). Nullable e on delete set null pelo '
  'mesmo motivo de concluido_por: excluir a conta de quem propôs não pode '
  'travar em constraint (LGPD, T10.1). O que importa preservar é o ciclo de '
  'status, não quem exatamente clicou.';
comment on column public.bookings.confirmado_cliente_em is
  'T05.3: a conclusão exige confirmação dos DOIS lados. Este campo marca a '
  'confirmação do cliente; concluido_em só é gravado quando os dois lados '
  'já confirmaram (ver aplicação, lib/contratacao.ts).';
comment on column public.bookings.confirmado_profissional_em is
  'T05.3: equivalente a confirmado_cliente_em, do lado do profissional.';
comment on column public.bookings.cancelado_por is
  'Quem cancelou ou recusou (T05.2/T05.4). Mesma lógica de nullability de '
  'concluido_por: não pode impedir exclusão de conta.';
comment on column public.bookings.motivo_cancelamento is
  'Motivo informado por quem cancelou ou recusou (T05.4). Opcional.';

-- Nenhuma constraint nova de coerência com `status`: a trava estrutural que
-- importa (avaliação exige conclusão) já está em `reviews`/`pode_avaliar`.
-- Amarrar proposto_por/cancelado_por ao status pelo mesmo mecanismo de
-- `conclusao_coerente_com_status` repetiria a armadilha que o comentário
-- daquela constraint já documenta: a coluna é `on delete set null`, então
-- qualquer constraint que exija "status = X implica coluna not null" quebra
-- a exclusão de conta de quem cancelou/propôs no passado.
