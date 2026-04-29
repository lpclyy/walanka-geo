/**
 * 请求验证中间件
 * @module middleware/validator
 * @description 提供请求数据验证的中间件
 */

const { validation, response } = require('../utils');

/**
 * 创建验证中间件
 * @param {Object} schema - 验证规则对象
 * @returns {Function} 中间件函数
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    // 验证请求体
    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`字段 ${field} 是必填项`);
          continue;
        }
        if (value !== undefined && value !== null && value !== '') {
          if (rules.type && !validation.isType(value, rules.type)) {
            errors.push(`字段 ${field} 类型错误，期望 ${rules.type}`);
          }
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`字段 ${field} 长度不能小于 ${rules.minLength}`);
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`字段 ${field} 长度不能大于 ${rules.maxLength}`);
          }
        }
      }
    }

    // 验证查询参数
    if (schema.query) {
      for (const [field, rules] of Object.entries(schema.query)) {
        const value = req.query[field];
        if (rules.required && !req.query[field]) {
          errors.push(`查询参数 ${field} 是必填项`);
        }
      }
    }

    // 验证路由参数
    if (schema.params) {
      for (const [field, rules] of Object.entries(schema.params)) {
        const value = req.params[field];
        if (rules.required && !req.params[field]) {
          errors.push(`路由参数 ${field} 是必填项`);
        }
      }
    }

    if (errors.length > 0) {
      return response.sendValidationError(res, errors);
    }

    next();
  };
}

/**
 * 验证手机号中间件
 * @param {string} field - 字段名
 * @returns {Function} 中间件函数
 */
function validatePhone(field = 'phone') {
  return (req, res, next) => {
    const phone = req.body[field] || req.query[field];
    if (phone && !validation.isValidPhone(phone)) {
      return response.sendError(res, '请输入正确的手机号码', 400);
    }
    next();
  };
}

/**
 * 验证邮箱中间件
 * @param {string} field - 字段名
 * @returns {Function} 中间件函数
 */
function validateEmail(field = 'email') {
  return (req, res, next) => {
    const email = req.body[field] || req.query[field];
    if (email && !validation.isValidEmail(email)) {
      return response.sendError(res, '请输入正确的邮箱地址', 400);
    }
    next();
  };
}

/**
 * 验证URL中间件
 * @param {string} field - 字段名
 * @returns {Function} 中间件函数
 */
function validateUrl(field = 'url') {
  return (req, res, next) => {
    const url = req.body[field] || req.query[field];
    if (url && !validation.isValidUrl(url)) {
      return response.sendError(res, '请输入正确的URL地址', 400);
    }
    next();
  };
}

module.exports = {
  validate,
  validatePhone,
  validateEmail,
  validateUrl
};
