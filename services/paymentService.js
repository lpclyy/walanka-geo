/**
 * 支付服务模块
 * @module services/paymentService
 * @description 提供支付相关的业务逻辑处理
 */

const config = require('../config');

/**
 * 套餐价格配置
 * @type {Object}
 */
const PLAN_PRICES = {
  pro: 999,
  enterprise: 2999
};

/**
 * 支付方式配置
 * @type {Object}
 */
const PAYMENT_METHODS = {
  wechat: {
    name: '微信支付',
    icon: 'wechat'
  },
  alipay: {
    name: '支付宝',
    icon: 'alipay'
  }
};

/**
 * 创建支付订单
 * @param {Object} params - 支付参数
 * @param {string} params.plan - 套餐类型
 * @param {string} params.paymentMethod - 支付方式
 * @param {string} params.orderId - 订单号
 * @returns {Promise<Object>} 支付订单信息
 */
async function createPaymentOrder({ plan, paymentMethod, orderId }) {
  const price = PLAN_PRICES[plan];

  if (!price) {
    throw new Error('无效的套餐类型');
  }

  if (!PAYMENT_METHODS[paymentMethod]) {
    throw new Error('无效的支付方式');
  }

  const paymentData = {
    orderId,
    plan,
    amount: price,
    paymentMethod,
    payUrl: generatePayUrl(paymentMethod, orderId, price),
    createdAt: new Date().toISOString()
  };

  console.log('创建支付订单:', paymentData);

  return paymentData;
}

/**
 * 生成支付链接
 * @param {string} method - 支付方式
 * @param {string} orderId - 订单号
 * @param {number} amount - 金额
 * @returns {string} 支付链接
 */
function generatePayUrl(method, orderId, amount) {
  if (method === 'wechat') {
    const wechatConfig = config.api.wechatPay;
    if (wechatConfig.appId && wechatConfig.mchId) {
      return `https://api.mch.weixin.qq.com/v3/pay/transactions/native?orderId=${orderId}`;
    }
    return `https://payment.example.com/wechat?orderId=${orderId}&amount=${amount}`;
  } else if (method === 'alipay') {
    const alipayConfig = config.api.alipay;
    if (alipayConfig.appId && alipayConfig.privateKey) {
      return `https://openapi.alipay.com/gateway.do?orderId=${orderId}&amount=${amount}`;
    }
    return `https://payment.example.com/alipay?orderId=${orderId}&amount=${amount}`;
  }
  return '';
}

/**
 * 查询支付状态
 * @param {string} orderId - 订单号
 * @returns {Promise<Object>} 支付状态信息
 */
async function queryPaymentStatus(orderId) {
  console.log(`查询订单 ${orderId} 的支付状态`);

  return {
    orderId,
    status: 'pending',
    message: '支付状态查询成功'
  };
}

/**
 * 处理支付回调
 * @param {string} paymentMethod - 支付方式
 * @param {Object} callbackData - 回调数据
 * @returns {Promise<Object>} 处理结果
 */
async function handlePaymentCallback(paymentMethod, callbackData) {
  console.log(`处理${PAYMENT_METHODS[paymentMethod]?.name || paymentMethod}支付回调:`, callbackData);

  try {
    if (paymentMethod === 'wechat') {
      return await handleWechatCallback(callbackData);
    } else if (paymentMethod === 'alipay') {
      return await handleAlipayCallback(callbackData);
    }
    throw new Error('不支持的支付方式');
  } catch (error) {
    console.error('处理支付回调失败:', error);
    throw error;
  }
}

/**
 * 处理微信支付回调
 * @param {Object} data - 回调数据
 * @returns {Promise<Object>} 处理结果
 */
async function handleWechatCallback(data) {
  console.log('处理微信支付回调:', data);

  return {
    success: true,
    message: '回调处理成功'
  };
}

/**
 * 处理支付宝支付回调
 * @param {Object} data - 回调数据
 * @returns {Promise<Object>} 处理结果
 */
async function handleAlipayCallback(data) {
  console.log('处理支付宝支付回调:', data);

  return {
    success: true,
    message: '回调处理成功'
  };
}

/**
 * 获取套餐价格
 * @param {string} plan - 套餐类型
 * @returns {number} 套餐价格
 */
function getPlanPrice(plan) {
  return PLAN_PRICES[plan] || 0;
}

/**
 * 获取所有套餐列表
 * @returns {Array} 套餐列表
 */
function getAllPlans() {
  return Object.entries(PLAN_PRICES).map(([key, price]) => ({
    type: key,
    price,
    name: key === 'pro' ? '专业版' : '企业版'
  }));
}

module.exports = {
  createPaymentOrder,
  queryPaymentStatus,
  handlePaymentCallback,
  getPlanPrice,
  getAllPlans,
  PLAN_PRICES,
  PAYMENT_METHODS
};
