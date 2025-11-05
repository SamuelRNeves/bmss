-- Active: 1743081579574@@localhost@3307@bmss_db
-- ===============================
-- ✅ BMSS - PostgreSQL Schema
-- Versão: V1__init.sql
-- ===============================

-- ====== TABLE: roles ======
CREATE TABLE roles (
    id      BIGSERIAL PRIMARY KEY,
    name    VARCHAR(255) NOT NULL UNIQUE
);

-- ====== TABLE: users ======
CREATE TABLE users (
    id                      BIGSERIAL PRIMARY KEY,
    name                    VARCHAR(255),
    email                   VARCHAR(255) NOT NULL UNIQUE,
    password_hash           VARCHAR(255),
    role_id                 BIGINT REFERENCES roles(id) ON DELETE SET NULL,
    notification_preference VARCHAR(50) DEFAULT 'diario',
    created_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ====== TABLE: sources ======
CREATE TABLE sources (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    url  VARCHAR(255)
);

-- ====== TABLE: items ======
CREATE TABLE items (
    id               BIGSERIAL PRIMARY KEY,
    title            VARCHAR(255),
    text             TEXT NOT NULL,
    url              VARCHAR(255),
    published_at     TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW(),
    source_id        BIGINT REFERENCES sources(id) ON DELETE SET NULL,
    source_name      VARCHAR(255),
    sentiment_label  VARCHAR(255),
    sentiment_score  DOUBLE PRECISION,
    analyzed_at      TIMESTAMP,
    is_tweet         BOOLEAN DEFAULT FALSE,
    tweet_id         VARCHAR(255)
);

CREATE INDEX idx_items_published_at ON items(published_at DESC);
CREATE INDEX idx_items_source_id ON items(source_id);
CREATE INDEX idx_items_tweet_id ON items(tweet_id);

-- ====== TABLE: comments ======
CREATE TABLE comments (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    item_id    BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_item_id ON comments(item_id);

-- ====== TABLE: sentiments ======
CREATE TABLE sentiments (
    id         BIGSERIAL PRIMARY KEY,
    item_id    BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    label      VARCHAR(255),
    score      DOUBLE PRECISION,
    model      VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sentiments_item_id ON sentiments(item_id);

-- ====== SEED: roles ======
INSERT INTO roles(name) VALUES ('USER') ON CONFLICT DO NOTHING;
INSERT INTO roles(name) VALUES ('ADMIN') ON CONFLICT DO NOTHING;

