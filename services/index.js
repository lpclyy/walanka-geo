/**
 * 服务模块统一导出
 * @module services
 * @description 集中导出所有服务模块
 */

const userService = require('./userService');
const articleService = require('./articleService');
const brandService = require('./brandService');
const paymentService = require('./paymentService');
const verifyCodeService = require('./verifyCodeService');
const activityService = require('./activityService');
const promptService = require('./promptService');

module.exports = {
  userService,
  articleService,
  brandService,
  paymentService,
  verifyCodeService,
  activityService,
  promptService
};
