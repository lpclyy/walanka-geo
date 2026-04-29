/**
 * 数据库模块
 * @module models/database
 * @description 提供数据库连接、初始化和访问功能
 */

const mysql = require('mysql2/promise');
const redis = require('redis');
const config = require('../config');

let db;
let redisClient;

/**
 * 连接到MySQL数据库
 * @returns {Promise<Object>} 数据库连接池
 */
async function connectDB() {
  try {
    const dbConfig = config.database.db;
    db = await mysql.createPool(dbConfig);
    console.log('MySQL connected');
    await initializeTables(db);
    return db;
  } catch (error) {
    console.error('MySQL connection failed:', error);
    throw error;
  }
}

/**
 * 连接到Redis数据库
 * @returns {Promise<Object>} Redis客户端
 */
async function connectRedis() {
  const redisConfig = config.database.redis;
  redisClient = redis.createClient(redisConfig);

  redisClient.connect().catch(error => {
    console.error('Redis连接失败:', error);
    console.log('Redis连接失败，但服务器将继续运行');
  });

  return redisClient;
}

/**
 * 初始化所有数据库表
 * @param {Object} db - 数据库连接池
 * @returns {Promise<void>}
 */
async function initializeTables(db) {
  await createUserTable(db);
  await createArticleTable(db);
  await createPageContentTable(db);
  await createBrandTables(db);
  await createActivityLogTable(db);
}

/**
 * 创建用户表
 * @param {Object} db - 数据库连接池
 * @returns {Promise<void>}
 */
async function createUserTable(db) {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('User table created or already exists');
    await createAdminAccount(db);
  } catch (error) {
    console.error('Create user table failed:', error);
  }
}

/**
 * 创建管理员账号
 * @param {Object} db - 数据库连接池
 * @returns {Promise<void>}
 */
async function createAdminAccount(db) {
  try {
    const adminPhone = '15981241372';
    const adminName = 'root';
    const adminPassword = '123456789';

    const [existingUsers] = await db.execute('SELECT * FROM users WHERE phone = ?', [adminPhone]);

    if (existingUsers.length === 0) {
      await db.execute(
        'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)',
        [adminName, adminPhone, adminPassword, 'admin']
      );
      console.log('管理员账号创建成功');
    } else {
      console.log('管理员账号已存在');
    }
  } catch (error) {
    console.error('创建管理员账号失败:', error);
  }
}

/**
 * 创建文章表
 * @param {Object} db - 数据库连接池
 * @returns {Promise<void>}
 */
async function createArticleTable(db) {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Article table created or already exists');
    await insertDefaultArticles(db);
  } catch (error) {
    console.error('Create article table failed:', error);
  }
}

/**
 * 插入默认文章
 * @param {Object} db - 数据库连接池
 * @returns {Promise<void>}
 */
async function insertDefaultArticles(db) {
  try {
    const [existingArticles] = await db.execute('SELECT * FROM articles LIMIT 1');
    if (existingArticles.length === 0) {
      const defaultArticles = [
        {
          title: '不限篇数、永久免费！GEO 内容创作，用瓦兰卡免费GEO工具轻松掌握',
          author: '瓦兰卡免费GEO',
          content: '瓦兰卡免费GEO工具是国内首个免费的GEO优化平台，通过AI技术帮助企业提升品牌在AI平台的影响力和转化率。',
          category: 'tutorials'
        },
        {
          title: '2026年 3-4月国内主流 AI平台核心数据全景报告',
          author: '瓦兰卡免费GEO',
          content: '本报告分析了2026年3-4月国内主流AI平台的核心数据，为企业提供GEO优化的参考。',
          category: 'industry-news'
        },
        {
          title: '瓦兰卡免费GEO工具更新日志',
          author: '瓦兰卡免费GEO',
          content: '本文档记录了瓦兰卡免费GEO工具的更新历史和功能变化。',
          category: 'product-updates'
        },
        {
          title: '用瓦兰卡GEO进行GEO优化教程（商家低成本自己操作教程）',
          author: '瓦兰卡免费GEO',
          content: '本教程详细介绍了如何使用瓦兰卡GEO工具进行GEO优化，帮助商家低成本自己操作。',
          category: 'tutorials'
        },
        {
          title: 'GEO优化技术深度解析',
          author: '瓦兰卡技术团队',
          content: '本文深入解析了GEO优化的技术原理和实践方法，帮助企业更好地理解和应用GEO优化。',
          category: 'technical-articles'
        }
      ];

      for (const article of defaultArticles) {
        await db.execute(
          'INSERT INTO articles (title, author, content, category) VALUES (?, ?, ?, ?)',
          [article.title, article.author, article.content, article.category]
        );
      }
      console.log('默认文章插入成功');
    }
  } catch (error) {
    console.error('插入默认文章失败:', error);
  }
}

/**
 * 创建品牌相关表
 * @param {Object} db - 数据库连接池
 * @returns {Promise<void>}
 */
async function createBrandTables(db) {
  try {
    await db.execute(`
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
      )
    `);
    console.log('Brands table created or already exists');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS brand_prompt_suggestions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        brand_id INT NOT NULL,
        prompt_text TEXT NOT NULL,
        category VARCHAR(50),
        is_selected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_brand_id (brand_id)
      )
    `);
    console.log('Brand prompt suggestions table created or already exists');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS brand_selected_prompts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        brand_id INT NOT NULL,
        prompt_text TEXT NOT NULL,
        is_custom BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_brand_id (brand_id)
      )
    `);
    console.log('Brand selected prompts table created or already exists');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS brand_prompt_list (
        id INT AUTO_INCREMENT PRIMARY KEY,
        brand_id INT NOT NULL,
        prompt_text TEXT NOT NULL,
        source ENUM('system', 'custom', 'ai_generated') DEFAULT 'system',
        usage_count INT DEFAULT 0,
        effectiveness_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_brand_id (brand_id)
      )
    `);
    console.log('Brand prompt list table created or already exists');

    await db.execute(`
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
      )
    `);
    console.log('Brand analysis table created or already exists');

  } catch (error) {
    console.error('Create brand tables failed:', error);
  }
}

/**
 * 创建活动日志表
 * @param {Object} db - 数据库连接池
 * @returns {Promise<void>}
 */
async function createActivityLogTable(db) {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        action_type ENUM('login', 'add_user', 'edit_user', 'delete_user', 'add_article', 'edit_article', 'delete_article', 'add_brand', 'edit_brand', 'delete_brand') NOT NULL,
        action_description TEXT NOT NULL,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_action_type (action_type),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('Activity logs table created or already exists');
  } catch (error) {
    console.error('Create activity logs table failed:', error);
  }
}

/**
 * 创建页面内容表
 * @param {Object} db - 数据库连接池
 * @returns {Promise<void>}
 */
async function createPageContentTable(db) {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS page_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page_name VARCHAR(50) NOT NULL,
        section_name VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_page_section (page_name, section_name)
      )
    `);
    console.log('Page content table created or already exists');
    await insertDefaultPageContent(db);
  } catch (error) {
    console.error('Create page content table failed:', error);
  }
}

/**
 * 插入默认页面内容
 * @param {Object} db - 数据库连接池
 * @returns {Promise<void>}
 */
async function insertDefaultPageContent(db) {
  try {
    const [existingContent] = await db.execute('SELECT * FROM page_content WHERE page_name = "home" LIMIT 1');
    if (existingContent.length === 0) {
      const defaultContent = [
        { page_name: 'home', section_name: 'hero_title', content: '瓦兰卡免费GEO工具' },
        { page_name: 'home', section_name: 'hero_subtitle', content: '国内首个免费的GEO优化平台，通过AI技术帮助企业提升品牌在AI平台的影响力和转化率' },
        { page_name: 'home', section_name: 'pricing_title', content: '免费使用' },
        { page_name: 'home', section_name: 'pricing_subtitle', content: '无需信用卡，立即开始使用' },
        { page_name: 'home', section_name: 'testimonial_title', content: '用户评价' },
        { page_name: 'home', section_name: 'testimonial_subtitle', content: '听听我们的用户怎么说' },
        { page_name: 'home', section_name: 'faq_title', content: '常见问题' },
        { page_name: 'home', section_name: 'faq_subtitle', content: '关于瓦兰卡免费GEO工具的常见问题' },
        { page_name: 'home', section_name: 'footer_text', content: '© 2026 瓦兰卡免费GEO工具. 保留所有权利.' }
      ];

      for (const item of defaultContent) {
        await db.execute(
          'INSERT INTO page_content (page_name, section_name, content) VALUES (?, ?, ?)',
          [item.page_name, item.section_name, item.content]
        );
      }
      console.log('默认首页内容插入成功');
    }
  } catch (error) {
    console.error('插入默认首页内容失败:', error);
  }
}

/**
 * 获取数据库连接池
 * @returns {Object} 数据库连接池
 */
function getDB() {
  return db;
}

/**
 * 获取Redis客户端
 * @returns {Object} Redis客户端
 */
function getRedisClient() {
  return redisClient;
}

module.exports = {
  connectDB,
  connectRedis,
  getDB,
  getRedisClient,
  initializeTables
};
