-- BMSS Database Schema (Artefatos de Banco de Dados)
-- Autor: Samuel Neves
-- Data: 16/09/2025

-- Criação do banco de dados
CREATE DATABASE IF NOT EXISTS bmss_db;
USE bmss_db;

-- Tabela: users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: items
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    title TEXT NULL,
    text TEXT NOT NULL,
    url TEXT NULL,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: sentiments
CREATE TABLE sentiments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    label VARCHAR(10) NOT NULL,
    score DECIMAL(3,2) NOT NULL,
    model VARCHAR(80) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
