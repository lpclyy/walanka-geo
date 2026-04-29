/**
 * 管理员路由模块
 * @module routes/admin
 * @description 提供管理员相关功能路由
 */

const express = require('express');
const router = express.Router();
const database = require('../models/database');
const userService = require('../services/userService');
const articleService = require('../services/articleService');
const activityService = require('../services/activityService');
const paymentService = require('../services/paymentService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendSuccess, sendError, sendNotFound } = require('../utils/response');

router.get('/articles', async (req, res) => {
  try {
    const articles = await articleService.getAllArticles();
    return sendSuccess(res, articles);
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return sendError(res, '获取文章列表失败');
  }
});

router.post('/articles', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, author, content, category } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!title || !author || !content || !category) {
      return sendError(res, '请填写完整信息', 400);
    }

    const article = await articleService.createArticle({ title, author, content, category });

    await activityService.logActivity(
      req.user.id || 1,
      req.user.name || '管理员',
      activityService.ACTION_TYPES.ADD_ARTICLE,
      `添加了文章《${title}》`,
      ipAddress
    );

    return sendSuccess(res, article, '文章添加成功');
  } catch (error) {
    console.error('添加文章失败:', error);
    return sendError(res, '添加文章失败');
  }
});

router.put('/articles/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, content, category } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!title || !author || !content || !category) {
      return sendError(res, '请填写完整信息', 400);
    }

    const updated = await articleService.updateArticle(id, { title, author, content, category });

    if (!updated) {
      return sendNotFound(res, '文章');
    }

    await activityService.logActivity(
      req.user.id || 1,
      req.user.name || '管理员',
      activityService.ACTION_TYPES.EDIT_ARTICLE,
      `编辑了文章《${title}》`,
      ipAddress
    );

    return sendSuccess(res, null, '文章更新成功');
  } catch (error) {
    console.error('更新文章失败:', error);
    return sendError(res, '更新文章失败');
  }
});

router.delete('/articles/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const article = await articleService.getArticleById(id);
    if (!article) {
      return sendNotFound(res, '文章');
    }

    await articleService.deleteArticle(id);

    await activityService.logActivity(
      req.user.id || 1,
      req.user.name || '管理员',
      activityService.ACTION_TYPES.DELETE_ARTICLE,
      `删除了文章《${article.title}》`,
      ipAddress
    );

    return sendSuccess(res, null, '文章删除成功');
  } catch (error) {
    console.error('删除文章失败:', error);
    return sendError(res, '删除文章失败');
  }
});

router.get('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const article = await articleService.getArticleById(id);

    if (!article) {
      return sendNotFound(res, '文章');
    }

    return sendSuccess(res, article);
  } catch (error) {
    console.error('获取文章详情失败:', error);
    return sendError(res, '获取文章详情失败');
  }
});

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    return sendSuccess(res, users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return sendError(res, '获取用户列表失败');
  }
});

router.post('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!name || !phone || !password) {
      return sendError(res, '请填写完整信息', 400);
    }

    const userExists = await userService.isUserExists(phone);
    if (userExists) {
      return sendError(res, '该手机号已注册', 400);
    }

    const user = await userService.createUser({ name, phone, password, role });

    await activityService.logActivity(
      req.user.id,
      req.user.name,
      activityService.ACTION_TYPES.ADD_USER,
      `添加了新用户 ${name}`,
      ipAddress
    );

    return sendSuccess(res, user, '用户添加成功');
  } catch (error) {
    console.error('添加用户失败:', error);
    return sendError(res, '添加用户失败');
  }
});

router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password, role } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!name || !phone) {
      return sendError(res, '请填写完整信息', 400);
    }

    const user = await userService.updateUser(id, { name, phone, password, role });

    await activityService.logActivity(
      req.user.id,
      req.user.name,
      activityService.ACTION_TYPES.EDIT_USER,
      `修改了用户 ${name} 的信息`,
      ipAddress
    );

    return sendSuccess(res, user, '用户更新成功');
  } catch (error) {
    console.error('更新用户失败:', error);
    return sendError(res, '更新用户失败');
  }
});

router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const user = await userService.findUserById(id);
    if (!user) {
      return sendNotFound(res, '用户');
    }

    await userService.deleteUser(id);

    await activityService.logActivity(
      req.user.id,
      req.user.name,
      activityService.ACTION_TYPES.DELETE_USER,
      `删除了用户 ${user.name}`,
      ipAddress
    );

    return sendSuccess(res, null, '用户删除成功');
  } catch (error) {
    console.error('删除用户失败:', error);
    return sendError(res, '删除用户失败');
  }
});

router.get('/activities', authenticate, requireAdmin, async (req, res) => {
  try {
    const activities = await activityService.getRecentActivities(10);
    return sendSuccess(res, activities);
  } catch (error) {
    console.error('获取活动数据失败:', error);
    return sendError(res, '获取活动数据失败');
  }
});

router.get('/page-content/:page', async (req, res) => {
  try {
    const { page } = req.params;
    const db = database.getDB();
    const [content] = await db.execute(
      'SELECT section_name, content FROM page_content WHERE page_name = ?',
      [page]
    );

    const contentObj = {};
    content.forEach(item => {
      contentObj[item.section_name] = item.content;
    });

    return sendSuccess(res, contentObj);
  } catch (error) {
    console.error('获取页面内容失败:', error);
    return sendError(res, '获取页面内容失败');
  }
});

router.put('/page-content/:page', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page } = req.params;
    const content = req.body;
    const db = database.getDB();

    await db.execute('START TRANSACTION');

    try {
      for (const [section, value] of Object.entries(content)) {
        await db.execute(
          'INSERT INTO page_content (page_name, section_name, content) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE content = ?',
          [page, section, value, value]
        );
      }

      await db.execute('COMMIT');
      return sendSuccess(res, null, '页面内容更新成功');
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('更新页面内容失败:', error);
    return sendError(res, '更新页面内容失败');
  }
});

router.get('/stats/visits', async (req, res) => {
  try {
    const db = database.getDB();
    const [result] = await db.execute('SELECT COUNT(*) as visits FROM page_views');
    const visits = result[0]?.visits || 0;
    return sendSuccess(res, { visits });
  } catch (error) {
    console.error('获取访问量失败:', error);
    return sendSuccess(res, { visits: 0 });
  }
});

router.get('/stats/active-users', async (req, res) => {
  try {
    const db = database.getDB();
    const [result] = await db.execute('SELECT COUNT(*) as activeUsers FROM users');
    const activeUsers = result[0]?.activeUsers || 0;
    return sendSuccess(res, { activeUsers });
  } catch (error) {
    console.error('获取活跃用户数失败:', error);
    return sendError(res, '获取活跃用户数失败');
  }
});

module.exports = router;
