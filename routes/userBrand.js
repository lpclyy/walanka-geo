/**
 * 用户品牌路由模块
 * @module routes/userBrand
 * @description 提供用户级品牌管理的REST API，实现数据隔离和权限控制
 */

const express = require('express');
const router = express.Router();
const userBrandService = require('../services/userBrandService');
const aiService = require('../services/aiService');
const { authenticate } = require('../middleware/auth');
const { sendSuccess, sendError, sendNotFound, sendForbidden } = require('../utils/response');
const { validateAndFix } = require('../utils/dataValidator');

/**
 * 品牌数据验证Schema
 */
const brandSchema = {
  name: { type: 'string', required: true, maxLength: 200 },
  website: { type: 'string', required: true, maxLength: 500 },
  description: { type: 'string', maxLength: 2000 },
  industry: { type: 'string', maxLength: 100 },
  positioning: { type: 'string', maxLength: 500 },
  logoUrl: { type: 'string', maxLength: 500 }
};

/**
 * GET /api/user-brands
 * 获取当前用户的品牌列表
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brands = await userBrandService.getUserBrands(userId);
    return sendSuccess(res, brands);
  } catch (error) {
    console.error('获取品牌列表失败:', error);
    return sendError(res, '获取品牌列表失败');
  }
});

/**
 * GET /api/user-brands/active
 * 获取当前用户的活跃品牌
 */
router.get('/active', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brand = await userBrandService.getActiveBrand(userId);
    
    if (!brand) {
      return sendSuccess(res, null);
    }
    
    return sendSuccess(res, brand);
  } catch (error) {
    console.error('获取活跃品牌失败:', error);
    return sendError(res, '获取活跃品牌失败');
  }
});

/**
 * POST /api/user-brands/active/:brandId
 * 设置活跃品牌
 */
router.post('/active/:brandId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandId = parseInt(req.params.brandId);
    
    if (isNaN(brandId)) {
      return sendError(res, '无效的品牌ID', 400);
    }
    
    await userBrandService.setActiveBrand(userId, brandId);
    return sendSuccess(res, null, '活跃品牌设置成功');
  } catch (error) {
    console.error('设置活跃品牌失败:', error);
    if (error.message === '品牌不存在或不属于当前用户') {
      return sendForbidden(res, error.message);
    }
    return sendError(res, '设置活跃品牌失败');
  }
});

/**
 * POST /api/user-brands
 * 创建新品牌
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, website, description, industry, positioning, logoUrl } = req.body;
    
    // 验证数据
    const validation = validateAndFix({ name, website, description, industry, positioning, logoUrl }, brandSchema);
    
    if (!validation.valid) {
      return sendError(res, validation.errors.join('; '), 400);
    }
    
    const brand = await userBrandService.createUserBrand({
      userId,
      brandName: validation.data.name,
      website: validation.data.website,
      description: validation.data.description,
      industry: validation.data.industry,
      positioning: validation.data.positioning,
      logoUrl: validation.data.logoUrl
    });
    
    return sendSuccess(res, brand, '品牌创建成功');
  } catch (error) {
    console.error('创建品牌失败:', error);
    return sendError(res, '创建品牌失败');
  }
});

/**
 * GET /api/user-brands/:brandId
 * 获取品牌详情（带权限验证）
 */
router.get('/:brandId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandId = parseInt(req.params.brandId);
    
    if (isNaN(brandId)) {
      return sendError(res, '无效的品牌ID', 400);
    }
    
    const brand = await userBrandService.getBrandWithPermission(userId, brandId);
    
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
 * PUT /api/user-brands/:brandId
 * 更新品牌信息
 */
router.put('/:brandId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandId = parseInt(req.params.brandId);
    
    if (isNaN(brandId)) {
      return sendError(res, '无效的品牌ID', 400);
    }
    
    const { name, website, description, industry, positioning, logoUrl } = req.body;
    
    // 验证数据
    const validation = validateAndFix({ name, website, description, industry, positioning, logoUrl }, {
      name: { type: 'string', maxLength: 200 },
      website: { type: 'string', maxLength: 500 },
      description: { type: 'string', maxLength: 2000 },
      industry: { type: 'string', maxLength: 100 },
      positioning: { type: 'string', maxLength: 500 },
      logoUrl: { type: 'string', maxLength: 500 }
    });
    
    const updateData = {};
    if (name !== undefined) updateData.name = validation.data.name;
    if (website !== undefined) updateData.website = validation.data.website;
    if (description !== undefined) updateData.description = validation.data.description;
    if (industry !== undefined) updateData.industry = validation.data.industry;
    if (positioning !== undefined) updateData.positioning = validation.data.positioning;
    if (logoUrl !== undefined) updateData.logoUrl = validation.data.logoUrl;
    
    await userBrandService.updateUserBrand(userId, brandId, updateData);
    
    return sendSuccess(res, null, '品牌信息更新成功');
  } catch (error) {
    console.error('更新品牌失败:', error);
    if (error.message === '品牌不存在或不属于当前用户') {
      return sendForbidden(res, error.message);
    }
    return sendError(res, '更新品牌失败');
  }
});

/**
 * PUT /api/user-brands/:brandId/settings
 * 更新品牌设置
 */
router.put('/:brandId/settings', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandId = parseInt(req.params.brandId);
    
    if (isNaN(brandId)) {
      return sendError(res, '无效的品牌ID', 400);
    }
    
    const settings = req.body;
    
    await userBrandService.updateBrandSettings(userId, brandId, settings);
    
    return sendSuccess(res, null, '品牌设置更新成功');
  } catch (error) {
    console.error('更新品牌设置失败:', error);
    if (error.message === '品牌不存在或不属于当前用户') {
      return sendForbidden(res, error.message);
    }
    return sendError(res, '更新品牌设置失败');
  }
});

/**
 * DELETE /api/user-brands/:brandId
 * 删除品牌
 */
router.delete('/:brandId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandId = parseInt(req.params.brandId);
    
    if (isNaN(brandId)) {
      return sendError(res, '无效的品牌ID', 400);
    }
    
    await userBrandService.deleteUserBrand(userId, brandId);
    
    return sendSuccess(res, null, '品牌删除成功');
  } catch (error) {
    console.error('删除品牌失败:', error);
    if (error.message === '品牌不存在或不属于当前用户') {
      return sendForbidden(res, error.message);
    }
    return sendError(res, '删除品牌失败');
  }
});

/**
 * POST /api/user-brands/:brandId/analyze
 * 分析品牌（带权限验证）
 */
router.post('/:brandId/analyze', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandId = parseInt(req.params.brandId);
    
    if (isNaN(brandId)) {
      return sendError(res, '无效的品牌ID', 400);
    }
    
    // 验证权限
    const hasPermission = await userBrandService.checkBrandPermission(userId, brandId);
    if (!hasPermission) {
      return sendForbidden(res, '无权访问该品牌');
    }
    
    // 获取品牌信息
    const brand = await userBrandService.getBrandWithPermission(userId, brandId);
    if (!brand) {
      return sendNotFound(res, '品牌');
    }
    
    // 执行AI分析
    const analysisResult = await aiService.performAIAnalysis(brandId, {
      id: brand.id,
      name: brand.name,
      website: brand.website,
      description: brand.description,
      industry: brand.industry,
      positioning: brand.positioning
    });
    
    if (analysisResult.error) {
      console.error('分析失败:', analysisResult.error);
      return sendError(res, analysisResult.error.message || '分析失败');
    }
    
    // 保存分析结果
    const analysisId = await userBrandService.saveBrandAnalysis(userId, brandId, analysisResult);
    
    return sendSuccess(res, { 
      analysis: analysisResult, 
      analysisId,
      message: '分析完成' 
    });
  } catch (error) {
    console.error('分析品牌失败:', error);
    return sendError(res, '分析品牌失败');
  }
});

/**
 * GET /api/user-brands/:brandId/analysis
 * 获取品牌分析结果（带权限验证）
 */
router.get('/:brandId/analysis', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandId = parseInt(req.params.brandId);
    
    if (isNaN(brandId)) {
      return sendError(res, '无效的品牌ID', 400);
    }
    
    const analysis = await userBrandService.getBrandAnalysis(userId, brandId);
    
    if (!analysis) {
      return sendNotFound(res, '分析结果');
    }
    
    return sendSuccess(res, analysis);
  } catch (error) {
    console.error('获取分析结果失败:', error);
    if (error.message === '品牌不存在或不属于当前用户') {
      return sendForbidden(res, error.message);
    }
    return sendError(res, '获取分析结果失败');
  }
});

/**
 * GET /api/user-brands/:brandId/analysis/history
 * 获取品牌分析历史
 */
router.get('/:brandId/analysis/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandId = parseInt(req.params.brandId);
    const limit = parseInt(req.query.limit) || 10;
    
    if (isNaN(brandId)) {
      return sendError(res, '无效的品牌ID', 400);
    }
    
    const history = await userBrandService.getBrandAnalysisHistory(userId, brandId, limit);
    
    return sendSuccess(res, history);
  } catch (error) {
    console.error('获取分析历史失败:', error);
    if (error.message === '品牌不存在或不属于当前用户') {
      return sendForbidden(res, error.message);
    }
    return sendError(res, '获取分析历史失败');
  }
});

/**
 * GET /api/user-brands/stats
 * 获取用户分析统计数据
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await userBrandService.getUserAnalysisStats(userId);
    return sendSuccess(res, stats);
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return sendError(res, '获取统计数据失败');
  }
});

module.exports = router;
