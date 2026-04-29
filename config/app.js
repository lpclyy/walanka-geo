/**
 * 应用配置文件
 * @module config/app
 * @description 配置应用程序的通用参数
 */

module.exports = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3002,
    env: process.env.NODE_ENV || 'development'
  },

  // JWT认证配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256'
  },

  // 验证码配置
  verificationCode: {
    length: 6,
    expireTime: 300 // 5分钟过期
  },

  // 分页配置
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 100
  },

  // 文件上传配置
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx']
  }
};
