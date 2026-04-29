/**
 * 配置模块统一导出
 * @module config
 * @description 集中导出所有配置模块，提供统一的配置访问接口
 */

const database = require('./database');
const app = require('./app');
const api = require('./api');

/**
 * 获取指定配置项
 * @param {string} key - 配置键名，格式为'模块名.子键'，如'db.host'
 * @param {*} defaultValue - 默认值
 * @returns {*} 配置值
 */
function getConfig(key, defaultValue = undefined) {
  const keys = key.split('.');
  let config = null;

  if (keys[0] === 'db') {
    config = database.db;
  } else if (keys[0] === 'redis') {
    config = database.redis;
  } else if (keys[0] === 'server' || keys[0] === 'jwt' || keys[0] === 'pagination' || keys[0] === 'upload') {
    config = app[keys[0]];
  } else if (keys[0] === 'tencentCloud' || keys[0] === 'siliconFlow' || keys[0] === 'llm' || keys[0] === 'wechatPay' || keys[0] === 'alipay') {
    config = api[keys[0]];
  }

  if (!config) {
    return defaultValue;
  }

  return config[keys[1]] !== undefined ? config[keys[1]] : defaultValue;
}

module.exports = {
  database,
  app,
  api,
  getConfig
};
