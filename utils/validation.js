/**
 * 输入验证工具函数
 * @module utils/validation
 * @description 提供常用的输入验证函数
 */

/**
 * 验证手机号格式
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
function isValidPhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱
 * @returns {boolean} 是否有效
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证URL格式
 * @param {string} url - URL地址
 * @returns {boolean} 是否有效
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证必填字段
 * @param {Object} obj - 待验证对象
 * @param {string[]} fields - 必填字段数组
 * @returns {Object} {valid: boolean, missing: string[]}
 */
function validateRequired(obj, fields) {
  const missing = [];
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {boolean} 是否符合要求
 */
function isValidPassword(password) {
  return password && password.length >= 6;
}

/**
 * 验证验证码格式
 * @param {string} code - 验证码
 * @returns {boolean} 是否有效
 */
function isValidCode(code) {
  const codeRegex = /^\d{6}$/;
  return codeRegex.test(code);
}

/**
 * 清理字符串，防止XSS
 * @param {string} str - 待处理字符串
 * @returns {string} 清理后的字符串
 */
function sanitizeString(str) {
  if (!str) return '';
  return str
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * 验证对象类型
 * @param {*} obj - 待验证对象
 * @param {string} type - 期望类型
 * @returns {boolean} 是否匹配
 */
function isType(obj, type) {
  return typeof obj === type;
}

/**
 * 验证数组
 * @param {*} arr - 待验证对象
 * @returns {boolean} 是否为非空数组
 */
function isNonEmptyArray(arr) {
  return Array.isArray(arr) && arr.length > 0;
}

module.exports = {
  isValidPhone,
  isValidEmail,
  isValidUrl,
  validateRequired,
  isValidPassword,
  isValidCode,
  sanitizeString,
  isType,
  isNonEmptyArray
};
