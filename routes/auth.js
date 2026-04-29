/**
 * 用户认证路由模块
 * @module routes/auth
 * @description 提供用户注册、登录等认证相关路由
 */

const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const verifyCodeService = require('../services/verifyCodeService');
const activityService = require('../services/activityService');
const { generateToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { isValidPhone } = require('../utils/validation');

/**
 * POST /api/send-code
 * 发送验证码
 */
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!isValidPhone(phone)) {
      return sendError(res, '请输入正确的手机号码', 400);
    }

    const result = await verifyCodeService.sendVerificationCode(phone);
    return sendSuccess(res, null, result.message);
  } catch (error) {
    console.error('发送验证码失败:', error);
    return sendError(res, error.message || '发送验证码失败');
  }
});

/**
 * POST /api/register
 * 用户注册
 */
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, code } = req.body;

    if (!name || !phone || !password) {
      return sendError(res, '请填写完整信息', 400);
    }

    if (!isValidPhone(phone)) {
      return sendError(res, '请输入正确的手机号码', 400);
    }

    const userExists = await userService.isUserExists(phone);
    if (userExists) {
      return sendError(res, '该手机号已注册', 400);
    }

    const user = await userService.createUser({ name, phone, password, role: 'user' });
    const token = generateToken({ id: user.id, phone: user.phone });

    return sendSuccess(res, { user, token }, '注册成功');
  } catch (error) {
    console.error('注册失败:', error);
    return sendError(res, '注册失败，请稍后重试');
  }
});

/**
 * POST /api/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return sendError(res, '请输入手机号和密码', 400);
    }

    const user = await userService.findUserByPhone(phone);
    if (!user) {
      return sendError(res, '用户不存在', 400);
    }

    if (!userService.verifyPassword(password, user.password)) {
      return sendError(res, '密码错误', 400);
    }

    const token = generateToken({ id: user.id, phone: user.phone });

    return sendSuccess(res, { user, token }, '登录成功');
  } catch (error) {
    console.error('登录失败:', error);
    return sendError(res, '登录失败，请稍后重试');
  }
});

/**
 * POST /api/admin/login
 * 管理员登录
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!phone || !password) {
      return sendError(res, '请填写完整信息', 400);
    }

    const user = await userService.findUserByPhone(phone);
    if (!user || user.role !== 'admin') {
      return sendError(res, '管理员账号不存在', 400);
    }

    if (!userService.verifyPassword(password, user.password)) {
      return sendError(res, '密码错误', 400);
    }

    const token = generateToken({ id: user.id, phone: user.phone, role: user.role });

    await activityService.logActivity(
      user.id,
      user.name,
      activityService.ACTION_TYPES.LOGIN,
      '登录了管理系统',
      ipAddress
    );

    return sendSuccess(res, {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role
      },
      token
    }, '登录成功');
  } catch (error) {
    console.error('管理员登录失败:', error);
    return sendError(res, '登录失败，请稍后重试');
  }
});

module.exports = router;
