/**
 * 文章路由模块
 * @module routes/articles
 * @description 提供文章管理相关路由
 */

const express = require('express');
const router = express.Router();
const articleService = require('../services/articleService');
const activityService = require('../services/activityService');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { sendSuccess, sendError, sendNotFound } = require('../utils/response');

/**
 * GET /api/articles
 * 获取文章列表
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category } = req.query;
    const articles = await articleService.getAllArticles(category);
    return sendSuccess(res, articles);
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return sendError(res, '获取文章列表失败');
  }
});

/**
 * GET /api/articles/category/:category
 * 获取指定分类的文章
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const articles = await articleService.getArticlesByCategory(category);
    return sendSuccess(res, articles);
  } catch (error) {
    console.error('获取分类文章失败:', error);
    return sendError(res, '获取分类文章失败');
  }
});

/**
 * GET /api/articles/:id
 * 获取文章详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const article = await articleService.getArticleById(id);

    if (!article) {
      return sendNotFound(res, '文章');
    }

    await articleService.incrementViews(id);

    return sendSuccess(res, article);
  } catch (error) {
    console.error('获取文章详情失败:', error);
    return sendError(res, '获取文章详情失败');
  }
});

module.exports = router;
