-- =========================================
-- 🧩 V2__add_investor_profile_to_users.sql
-- Adiciona o campo 'investor_profile' à tabela users
-- =========================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS investor_profile VARCHAR(20) DEFAULT 'MODERADO' NOT NULL;

-- 🔒 (Opcional, mas recomendado)
ALTER TABLE users
ADD CONSTRAINT chk_investor_profile
CHECK (investor_profile IN ('CONSERVADOR', 'MODERADO', 'AGRESSIVO'));
