-- ==============================================
-- Cashflow Next - Database Migration for NAS
-- Jalankan ini di phpMyAdmin NAS Anda
-- ==============================================

-- 1. Tambah kolom app_name ke organization_profile (jika belum ada)
ALTER TABLE `organization_profile` 
ADD COLUMN IF NOT EXISTS `app_name` varchar(255) DEFAULT 'Cashflow App' AFTER `id`;

-- 2. Update app_name dengan nama aplikasi
UPDATE `organization_profile` SET `app_name` = 'APLIKASI KEUANGAN' WHERE `id` = 1;

-- 3. Update subtitle (tagline) 
UPDATE `organization_profile` SET `subtitle` = 'Aplikasi Keuangan SLB BCD NUSANTARA' WHERE `id` = 1;

-- 4. Fix logo_path (hapus prefix "public" jika ada)
UPDATE `organization_profile` 
SET `logo_path` = REPLACE(`logo_path`, 'public/uploads/', '/uploads/') 
WHERE `logo_path` LIKE 'public/%';

-- 5. Tambah tabel print_headers jika belum ada
CREATE TABLE IF NOT EXISTS `print_headers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `institution_name` varchar(255) NOT NULL,
  `subtitle` text DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `bank_info` varchar(255) DEFAULT NULL,
  `notary_info` text DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `signer_name` varchar(255) DEFAULT NULL,
  `signer_title` varchar(255) DEFAULT NULL,
  `signer_city` varchar(255) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
