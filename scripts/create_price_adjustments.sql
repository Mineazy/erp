CREATE TABLE IF NOT EXISTS erp_price_adjustments (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  price_type VARCHAR(20) NOT NULL COMMENT 'cost_price or selling_price',
  old_price DECIMAL(15,2) NOT NULL,
  new_price DECIMAL(15,2) NOT NULL,
  change_amount DECIMAL(15,2) NOT NULL,
  change_percent DECIMAL(8,4) DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  batch_id VARCHAR(36) DEFAULT NULL,
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_erp_price_adj_product (product_id),
  INDEX idx_erp_price_adj_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
