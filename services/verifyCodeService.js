/**
 * 验证码服务模块
 * @module services/verifyCodeService
 * @description 提供验证码生成、发送和验证功能
 */

const database = require('../models/database');
const config = require('../config');
const { isValidPhone } = require('../utils/validation');

/**
 * 生成6位数字验证码
 * @returns {string} 验证码
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 存储验证码到Redis
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @returns {Promise<void>}
 */
async function saveCodeToRedis(phone, code) {
  const redisClient = database.getRedisClient();
  const expireTime = config.app.verificationCode.expireTime;
  await redisClient.set(`code:${phone}`, code, { EX: expireTime });
  console.log(`验证码已存储: ${phone} -> ${code}, 有效期 ${expireTime}秒`);
}

/**
 * 从Redis获取验证码
 * @param {string} phone - 手机号
 * @returns {Promise<string|null>} 验证码或null
 */
async function getCodeFromRedis(phone) {
  const redisClient = database.getRedisClient();
  return await redisClient.get(`code:${phone}`);
}

/**
 * 发送验证码
 * @param {string} phone - 手机号
 * @returns {Promise<Object>} 发送结果
 */
async function sendVerificationCode(phone) {
  if (!isValidPhone(phone)) {
    throw new Error('请输入正确的手机号码');
  }

  const code = generateCode();

  await saveCodeToRedis(phone, code);

  console.log('========== 验证码发送 ==========');
  console.log(`手机号: ${phone}`);
  console.log(`验证码: ${code}`);
  console.log('=================================');

  return {
    success: true,
    message: '验证码已发送',
    code: process.env.NODE_ENV === 'development' ? code : undefined
  };
}

/**
 * 验证验证码
 * @param {string} phone - 手机号
 * @param {string} code - 用户输入的验证码
 * @returns {Promise<boolean>} 验证是否成功
 */
async function verifyCode(phone, code) {
  const storedCode = await getCodeFromRedis(phone);

  if (!storedCode) {
    console.log(`验证码已过期或不存在: ${phone}`);
    return false;
  }

  if (storedCode !== code) {
    console.log(`验证码不匹配: 输入=${code}, 存储=${storedCode}`);
    return false;
  }

  await deleteCode(phone);
  return true;
}

/**
 * 删除验证码
 * @param {string} phone - 手机号
 * @returns {Promise<void>}
 */
async function deleteCode(phone) {
  const redisClient = database.getRedisClient();
  await redisClient.del(`code:${phone}`);
}

module.exports = {
  generateCode,
  sendVerificationCode,
  verifyCode,
  deleteCode
};
