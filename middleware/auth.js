/**
 * 认证中间件
 * @module middleware/auth
 * @description 提供用户认证和授权相关的中间件
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { sendUnauthorized, sendForbidden } = require('../utils/response');

/**
 * 验证用户Token中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件函数
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, '未提供认证令牌');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.app.jwt.secret);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return sendUnauthorized(res, '令牌已过期');
      }
      return sendUnauthorized(res, '无效的认证令牌');
    }
  } catch (error) {
    console.error('认证中间件错误:', error);
    return sendUnauthorized(res, '认证失败');
  }
}

/**
 * 验证管理员权限中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件函数
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return sendUnauthorized(res, '请先登录');
  }

  if (req.user.role !== 'admin') {
    return sendForbidden(res, '需要管理员权限');
  }

  next();
}

/**
 * 生成JWT Token
 * @param {Object} payload - Token载荷数据
 * @returns {string} 生成的JWT Token
 */
function generateToken(payload) {
  return jwt.sign(payload, config.app.jwt.secret, {
    expiresIn: config.app.jwt.expiresIn,
    algorithm: config.app.jwt.algorithm
  });
}

/**
 * 验证可选Token中间件（不强制要求登录）
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件函数
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.app.jwt.secret);
      req.user = decoded;
    }

    next();
  } catch (error) {
    next();
  }
}

module.exports = {
  authenticate,
  requireAdmin,
  generateToken,
  optionalAuth
};
