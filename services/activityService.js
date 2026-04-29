/**
 * 活动日志服务模块
 * @module services/activityService
 * @description 提供活动日志记录和查询功能
 */

const database = require('../models/database');

/**
 * 动作类型枚举
 * @type {Object}
 */
const ACTION_TYPES = {
  LOGIN: 'login',
  ADD_USER: 'add_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  ADD_ARTICLE: 'add_article',
  EDIT_ARTICLE: 'edit_article',
  DELETE_ARTICLE: 'delete_article',
  ADD_BRAND: 'add_brand',
  EDIT_BRAND: 'edit_brand',
  DELETE_BRAND: 'delete_brand'
};

/**
 * 动作图标映射
 * @type {Object}
 */
const ACTION_ICONS = {
  login: 'fa-sign-in-alt',
  add_user: 'fa-user-plus',
  edit_user: 'fa-user-edit',
  delete_user: 'fa-user-minus',
  add_article: 'fa-file-plus',
  edit_article: 'fa-file-edit',
  delete_article: 'fa-file-minus',
  add_brand: 'fa-building',
  edit_brand: 'fa-building-edit',
  delete_brand: 'fa-building-slash'
};

/**
 * 记录活动日志
 * @param {number} userId - 用户ID
 * @param {string} userName - 用户名
 * @param {string} actionType - 动作类型
 * @param {string} actionDescription - 动作描述
 * @param {string} ipAddress - IP地址
 * @returns {Promise<void>}
 */
async function logActivity(userId, userName, actionType, actionDescription, ipAddress) {
  try {
    const db = database.getDB();
    if (!db) {
      console.error('数据库未连接，无法记录活动日志');
      return;
    }

    await db.execute(
      'INSERT INTO activity_logs (user_id, user_name, action_type, action_description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [userId, userName, actionType, actionDescription, ipAddress]
    );
  } catch (error) {
    console.error('记录活动日志失败:', error);
  }
}

/**
 * 获取最近的活动日志
 * @param {number} limit - 返回记录数量
 * @returns {Promise<Array>} 活动日志列表
 */
async function getRecentActivities(limit = 10) {
  try {
    const db = database.getDB();
    if (!db) {
      return getDefaultActivities();
    }

    const [activities] = await db.execute(
      'SELECT user_name, action_type, action_description, created_at FROM activity_logs ORDER BY created_at DESC LIMIT ?',
      [parseInt(limit)]
    );

    if (activities.length === 0) {
      return getDefaultActivities();
    }

    return activities.map(activity => formatActivity(activity));
  } catch (error) {
    console.error('获取活动日志失败:', error);
    return getDefaultActivities();
  }
}

/**
 * 格式化活动日志
 * @param {Object} activity - 原始活动数据
 * @returns {Object} 格式化后的活动数据
 */
function formatActivity(activity) {
  return {
    icon: ACTION_ICONS[activity.action_type] || 'fa-cog',
    time: getRelativeTime(activity.created_at),
    text: `${activity.user_name} ${activity.action_description}`
  };
}

/**
 * 获取相对时间描述
 * @param {Date|string} date - 日期
 * @returns {string} 相对时间描述
 */
function getRelativeTime(date) {
  const now = new Date();
  const activityDate = new Date(date);
  const diffMs = now - activityDate;
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
    return activityDate.toLocaleDateString('zh-CN');
  }
}

/**
 * 获取默认活动数据
 * @returns {Array} 默认活动列表
 */
function getDefaultActivities() {
  return [
    { icon: 'fa-sign-in-alt', time: '刚刚', text: '管理员登录了系统' },
    { icon: 'fa-user-plus', time: '10分钟前', text: '管理员添加了新用户' },
    { icon: 'fa-file-plus', time: '30分钟前', text: '管理员添加了新文章' },
    { icon: 'fa-user-edit', time: '1小时前', text: '管理员修改了用户信息' },
    { icon: 'fa-file-edit', time: '2小时前', text: '管理员编辑了文章' }
  ];
}

module.exports = {
  ACTION_TYPES,
  ACTION_ICONS,
  logActivity,
  getRecentActivities,
  getDefaultActivities
};
