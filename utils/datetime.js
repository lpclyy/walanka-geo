/**
 * 日期时间处理工具函数
 * @module utils/datetime
 * @description 提供常用的日期时间处理函数
 */

/**
 * 格式化日期为 YYYY/MM/DD 格式
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * 格式化时间为 HH:mm:ss 格式
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss 格式
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式化后的日期时间字符串
 */
function formatDateTime(date) {
  if (!date) return '';
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * 获取相对时间描述
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 相对时间描述
 */
function getRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return '刚刚';
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return formatDate(date);
  }
}

/**
 * 获取当前时间戳
 * @returns {number} 当前时间戳（秒）
 */
function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * 将时间戳转换为日期对象
 * @param {number} timestamp - 时间戳（秒或毫秒）
 * @returns {Date} 日期对象
 */
function timestampToDate(timestamp) {
  const ts = String(timestamp).length === 10 ? timestamp * 1000 : timestamp;
  return new Date(ts);
}

/**
 * 将日期对象转换为时间戳
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {number} 时间戳（秒）
 */
function dateToTimestamp(date) {
  return Math.floor(new Date(date).getTime() / 1000);
}

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  getRelativeTime,
  getCurrentTimestamp,
  timestampToDate,
  dateToTimestamp
};
