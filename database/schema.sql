-- Veritabanını oluştur ve seç
CREATE DATABASE IF NOT EXISTS otopark_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE otopark_db;

-- Yeniden çalıştırıldığında hata almamak için mevcut tabloları sırasıyla temizle
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS parking_spots;
DROP TABLE IF EXISTS users;

-- 1. Tablo: Kullanıcılar (Kimlik doğrulama ve Rol bazlı yetkilendirme için)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tablo: Otopark Alanları (Arama, filtreleme ve sayfalama yapılacak ana liste)
CREATE TABLE parking_spots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spot_code VARCHAR(20) NOT NULL UNIQUE,       -- Örn: A-01, B-05
    floor INT NOT NULL,                          -- Kat bilgisi (-1, 0, 1, 2 vb.)
    spot_type ENUM('standart', 'elektrikli', 'engelli') NOT NULL DEFAULT 'standart',
    hourly_rate DECIMAL(10, 2) NOT NULL,         -- Saatlik ücret (Örn: 50.00)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,     -- Bakımda mı / Kullanıma açık mı?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_spots_hourly_rate CHECK (hourly_rate >= 0)
);

-- 3. Tablo: Rezervasyonlar (users ve parking_spots ile Yabancı Anahtar [FK] ilişkili)
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    spot_id INT NOT NULL,
    plate_number VARCHAR(20) NOT NULL,           -- Araç plakası (Örn: 22 ABC 123)
    start_time DATETIME NOT NULL,                -- Rezervasyon başlangıç zamanı
    end_time DATETIME NOT NULL,                  -- Rezervasyon bitiş zamanı
    total_price DECIMAL(10, 2) NOT NULL,         -- Hesaplanan toplam tutar
    status ENUM('aktif', 'tamamlandi', 'iptal') NOT NULL DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Yabancı Anahtar (Foreign Key) Kısıtlamaları
    CONSTRAINT fk_reservations_user 
        FOREIGN KEY (user_id) REFERENCES users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_reservations_spot 
        FOREIGN KEY (spot_id) REFERENCES parking_spots(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_reservations_time CHECK (end_time > start_time)
);

-- Aramalarda ve tarih çakışması kontrollerinde performans için indeksler
CREATE INDEX idx_spots_filter ON parking_spots(floor, spot_type, is_active);
CREATE INDEX idx_reservations_time ON reservations(spot_id, status, start_time, end_time);

-- ==========================================================
-- ÖRNEK VERİLER (SEED DATA) - README ve Testler İçin
-- ==========================================================
-- Not: Aşağıdaki bcrypt hash'i "123456" şifresine karşılık gelmektedir ($2b$10$...).
INSERT INTO users (full_name, email, password_hash, role) VALUES
('Sistem Yöneticisi', 'admin@otopark.com', '$2b$10$DcFpmBe3GHRmaaKpnVOcRuaWev4PSg.M/AjhTwGoK.nVkHBVTMkaq', 'admin'),
('Örnek Kullanıcı', 'user@otopark.com', '$2b$10$DcFpmBe3GHRmaaKpnVOcRuaWev4PSg.M/AjhTwGoK.nVkHBVTMkaq', 'user');

-- Farklı kat ve tiplerde 12 adet örnek park yeri (Sayfalama ve filtrelemeyi test etmek için)
INSERT INTO parking_spots (spot_code, floor, spot_type, hourly_rate, is_active) VALUES
('A-01', 1, 'standart', 50.00, TRUE),
('A-02', 1, 'standart', 50.00, TRUE),
('A-03', 1, 'engelli', 30.00, TRUE),
('A-04', 1, 'elektrikli', 80.00, TRUE),
('A-05', 1, 'standart', 50.00, FALSE), -- Bakımda
('B-01', 2, 'standart', 45.00, TRUE),
('B-02', 2, 'standart', 45.00, TRUE),
('B-03', 2, 'elektrikli', 75.00, TRUE),
('B-04', 2, 'engelli', 30.00, TRUE),
('B-05', 2, 'standart', 45.00, TRUE),
('C-01', -1, 'standart', 40.00, TRUE),
('C-02', -1, 'elektrikli', 70.00, TRUE);

-- Örnek geçmiş ve ileri tarihli rezervasyonlar
INSERT INTO reservations (user_id, spot_id, plate_number, start_time, end_time, total_price, status) VALUES
(2, 1, '22 ABC 123', '2026-11-15 10:00:00', '2026-11-15 13:00:00', 150.00, 'tamamlandi'),
(2, 2, '34 IST 456', '2026-12-10 09:00:00', '2026-12-10 12:00:00', 150.00, 'aktif'),
(2, 4, '22 EV 022', '2026-12-12 14:00:00', '2026-12-12 16:00:00', 160.00, 'aktif');