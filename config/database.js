/**
 * 数据库配置文件
 * @module config/database
 * @description 配置MySQL和Redis数据库连接参数
 */

module.exports = {
  // MySQL数据库配置
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'walanka',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'walanka_geo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+08:00',
    dateStrings: true
  },

  // Redis配置
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined
  }
};
