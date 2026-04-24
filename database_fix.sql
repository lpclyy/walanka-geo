-- 修复brands表，添加positioning字段
ALTER TABLE brands ADD COLUMN IF NOT EXISTS positioning VARCHAR(100);

-- 确保其他必要的表和字段都存在
CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  description TEXT,
  industry VARCHAR(100),
  positioning VARCHAR(100),
  status ENUM('pending', 'analyzing', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS brand_prompt_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  prompt_text TEXT NOT NULL,
  category VARCHAR(50),
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_brand_id (brand_id)
);

CREATE TABLE IF NOT EXISTS brand_selected_prompts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  prompt_text TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_brand_id (brand_id)
);

CREATE TABLE IF NOT EXISTS brand_prompt_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  prompt_text TEXT NOT NULL,
  source ENUM('system', 'custom', 'ai_generated') DEFAULT 'system',
  usage_count INT DEFAULT 0,
  effectiveness_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_brand_id (brand_id)
);

CREATE TABLE IF NOT EXISTS brand_analysis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  overview JSON,
  visibility JSON,
  perception JSON,
  strengths JSON,
  opportunities JSON,
  competition JSON,
  risks JSON,
  topics JSON,
  citations JSON,
  snapshots JSON,
  suggestions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_brand_id (brand_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone (phone)
);

CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(100),
  category VARCHAR(50),
  tags VARCHAR(255),
  status ENUM('draft', 'published') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS page_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_name VARCHAR(100) NOT NULL UNIQUE,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  ip_address VARCHAR(50),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
