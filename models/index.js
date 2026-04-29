/**
 * 模型模块统一导出
 * @module models
 * @description 集中导出所有模型模块
 */

const database = require('./database');

module.exports = {
  ...database
};
