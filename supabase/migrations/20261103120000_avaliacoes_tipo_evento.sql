-- =============================================================================
-- E06 — Avaliações verificadas (T06.4 — Lembrete de avaliação)
-- =============================================================================
--
-- Só este ALTER TYPE, isolado numa migration própria. O Postgres não deixa
-- usar um valor de enum novo na MESMA transação que o adicionou (mesma regra
-- já vista — ver nota em docs/superpowers/ e o histórico de E08) — então a
-- função que de fato usa 'avaliacao_pendente' fica na próxima migration
-- (20261103120100), depois que esta já tiver sido commitada.

alter type public.tipo_evento_notificacao add value if not exists 'avaliacao_pendente';
