/**
 * 品牌路由模块
 * @module routes/brand
 * @description 提供品牌管理相关路由
 */

const express = require('express');
const router = express.Router();
const brandService = require('../services/brandService');
const aiService = require('../services/aiService');
const activityService = require('../services/activityService');
const { sendSuccess, sendError, sendNotFound } = require('../utils/response');

/**
 * POST /api/brands
 * 创建品牌
 */
router.post('/', async (req, res) => {
  try {
    const { userId, name, website } = req.body;

    if (!userId || !name || !website) {
      return sendError(res, '请填写品牌名称和网址', 400);
    }

    const brandId = await brandService.createBrand({ userId, name, website });

    return sendSuccess(res, {
      brandId,
      brand: { id: brandId, name, website, status: 'pending' }
    });
  } catch (error) {
    console.error('添加品牌失败:', error);
    return sendError(res, '添加品牌失败');
  }
});

/**
 * GET /api/brands
 * 获取品牌列表
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return sendError(res, '缺少用户ID', 400);
    }

    const brands = await brandService.getBrandsByUserId(userId);
    return sendSuccess(res, brands);
  } catch (error) {
    console.error('获取品牌列表失败:', error);
    return sendError(res, '获取品牌列表失败');
  }
});

/**
 * GET /api/brands/:id
 * 获取品牌详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await brandService.getBrandById(id);

    if (!brand) {
      return sendNotFound(res, '品牌');
    }

    return sendSuccess(res, brand);
  } catch (error) {
    console.error('获取品牌详情失败:', error);
    return sendError(res, '获取品牌详情失败');
  }
});

/**
 * POST /api/brands/:id/analyze
 * 开始品牌分析
 */
router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedPromptIds, customPrompts, brandInfo } = req.body;

    const analysisResult = await aiService.performAIAnalysis(id, brandInfo);

    if (analysisResult.error) {
      console.error('分析失败:', analysisResult.error.message);
      return sendError(res, analysisResult.error.message || '分析失败');
    }

    if (analysisResult) {
      console.log(`品牌分析完成: ID=${id}`);
      return sendSuccess(res, { analysis: analysisResult, message: '分析完成' });
    }

    return sendSuccess(res, { message: '分析已开始', status: 'analyzing' });
  } catch (error) {
    console.error('开始分析失败:', error);
    return sendError(res, '分析失败');
  }
});

/**
 * GET /api/brands/:id/analysis-status
 * 获取分析状态
 */
router.get('/:id/analysis-status', async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await brandService.getBrandById(id);

    if (!brand) {
      return sendNotFound(res, '品牌');
    }

    const statusInfo = brandService.getBrandStatusInfo(brand);
    return sendSuccess(res, statusInfo);
  } catch (error) {
    console.error('获取分析进度失败:', error);
    return sendError(res, '获取分析进度失败');
  }
});

/**
 * GET /api/brands/:id/analysis
 * 获取分析结果
 */
router.get('/:id/analysis', async (req, res) => {
  try {
    const { id } = req.params;
    let analysis = await brandService.getAnalysisByBrandId(id);

    if (!analysis) {
      const analysisResult = await aiService.performAIAnalysis(id);
      if (analysisResult) {
        analysis = await brandService.getAnalysisByBrandId(id);
      }
    }

    if (!analysis) {
      return sendNotFound(res, '分析结果');
    }

    return sendSuccess(res, analysis);
  } catch (error) {
    console.error('获取分析结果失败:', error);
    return sendError(res, '获取分析结果失败');
  }
});

/**
 * GET /api/brands/:id/prompts
 * 获取提示词列表
 */
router.get('/:id/prompts', async (req, res) => {
  try {
    const { id } = req.params;
    const prompts = await brandService.getPromptListByBrandId(id);
    return sendSuccess(res, prompts);
  } catch (error) {
    console.error('获取提示词列表失败:', error);
    return sendError(res, '获取提示词列表失败');
  }
});

/**
 * POST /api/brands/:id/prompts
 * 添加提示词
 */
router.post('/:id/prompts', async (req, res) => {
  try {
    const { id } = req.params;
    const { promptText, source } = req.body;

    if (!promptText) {
      return sendError(res, '请输入提示词内容', 400);
    }

    await brandService.addPromptToList(id, promptText, source);
    return sendSuccess(res, null, '提示词添加成功');
  } catch (error) {
    console.error('添加提示词失败:', error);
    return sendError(res, '添加提示词失败');
  }
});

/**
 * DELETE /api/brands/:id/prompts/:promptId
 * 删除提示词
 */
router.delete('/:id/prompts/:promptId', async (req, res) => {
  try {
    const { id, promptId } = req.params;
    await brandService.deletePromptFromList(promptId, id);
    return sendSuccess(res, null, '提示词删除成功');
  } catch (error) {
    console.error('删除提示词失败:', error);
    return sendError(res, '删除提示词失败');
  }
});

/**
 * DELETE /api/brands/:id
 * 删除品牌
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await brandService.deleteBrand(id);
    return sendSuccess(res, null, '品牌删除成功');
  } catch (error) {
    console.error('删除品牌失败:', error);
    return sendError(res, '删除品牌失败');
  }
});

module.exports = router;
