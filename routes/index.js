/**
 * 路由模块统一导出
 * @module routes
 * @description 集中导出所有路由模块
 */

const auth = require('./auth');
const articles = require('./articles');
const admin = require('./admin');
const payment = require('./payment');
const chat = require('./chat');
const brand = require('./brand');

module.exports = {
  auth,
  articles,
  admin,
  payment,
  chat,
  brand
};
