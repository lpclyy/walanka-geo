/**
 * 支付路由模块
 * @module routes/payment
 * @description 提供支付相关路由
 */

const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * POST /api/payment/create
 * 创建支付订单
 */
router.post('/create', async (req, res) => {
  try {
    const { plan, paymentMethod, orderId } = req.body;

    if (!plan || !paymentMethod || !orderId) {
      return sendError(res, '缺少必要参数', 400);
    }

    const paymentData = await paymentService.createPaymentOrder({ plan, paymentMethod, orderId });
    return sendSuccess(res, paymentData);
  } catch (error) {
    console.error('创建支付订单失败:', error);
    return sendError(res, error.message || '创建支付订单失败');
  }
});

/**
 * GET /api/payment/status/:orderId
 * 查询支付状态
 */
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const status = await paymentService.queryPaymentStatus(orderId);
    return sendSuccess(res, status);
  } catch (error) {
    console.error('查询支付状态失败:', error);
    return sendError(res, '查询支付状态失败');
  }
});

/**
 * POST /api/payment/callback
 * 支付回调处理
 */
router.post('/callback', async (req, res) => {
  try {
    const { paymentMethod, ...callbackData } = req.body;
    const result = await paymentService.handlePaymentCallback(paymentMethod, callbackData);
    return sendSuccess(res, result);
  } catch (error) {
    console.error('处理支付回调失败:', error);
    return sendError(res, '处理支付回调失败');
  }
});

/**
 * GET /api/payment/plans
 * 获取套餐列表
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = paymentService.getAllPlans();
    return sendSuccess(res, plans);
  } catch (error) {
    console.error('获取套餐列表失败:', error);
    return sendError(res, '获取套餐列表失败');
  }
});

module.exports = router;
