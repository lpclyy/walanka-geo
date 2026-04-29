/**
 * 中间件模块统一导出
 * @module middleware
 * @description 集中导出所有中间件模块
 */

const auth = require('./auth');
const error = require('./error');
const validator = require('./validator');

module.exports = {
  ...auth,
  ...error,
  ...validator
};
