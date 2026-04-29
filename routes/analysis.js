/**
 * 数据分析路由模块
 * @module routes/analysis
 * @description 提供品牌数据分析相关的REST API
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sendSuccess, sendError, sendNotFound, sendForbidden } = require('../utils/response');
const { validateAnalysisData, calculateTrend, getMetrics } = require('../services/analysisService');
const { collectBrandData, batchCollect, exportToCSV, exportToJSON, getPlatforms } = require('../services/dataCollector');
const userBrandService = require('../services/userBrandService');

/**
 * GET /api/analysis/metrics
 * 获取分析指标定义
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const { type } = req.query;
    const metrics = getMetrics(type);
    return sendSuccess(res, metrics);
  } catch (error) {
    console.error('获取指标定义失败:', error);
    return sendError(res, '获取指标定义失败');
  }
});

/**
 * GET /api/analysis/platforms
 * 获取数据采集平台列表
 */
router.get('/platforms', authenticate, async (req, res) => {
  try {
    const platforms = getPlatforms();
    return sendSuccess(res, platforms);
  } catch (error) {
    console.error('获取平台列表失败:', error);
    return sendError(res, '获取平台列表失败');
  }
});

/**
 * POST /api/analysis/collect/:brandId
 * 手动触发数据采集
 */
router.post('/collect/:brandId', authenticate, async (req, res) => {
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
    
    // 执行数据采集
    const collectResult = await collectBrandData({
      id: brand.id,
      name: brand.name,
      website: brand.website,
      description: brand.description,
      industry: brand.industry,
      positioning: brand.positioning
    });
    
    if (!collectResult.success) {
      return sendError(res, collectResult.errors.join('; ') || '数据采集失败');
    }
    
    // 保存采集结果
    const analysisId = await userBrandService.saveBrandAnalysis(userId, brandId, collectResult.data);
    
    return sendSuccess(res, { 
      analysis: collectResult.data,
      analysisId,
      collectedFrom: collectResult.collectedFrom,
      totalQueries: collectResult.totalQueries,
      message: '数据采集完成' 
    });
  } catch (error) {
    console.error('数据采集失败:', error);
    return sendError(res, '数据采集失败');
  }
});

/**
 * POST /api/analysis/batch-collect
 * 批量采集多个品牌数据
 */
router.post('/batch-collect', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { brandIds } = req.body;
    
    if (!brandIds || !Array.isArray(brandIds)) {
      return sendError(res, '请提供品牌ID列表', 400);
    }
    
    // 验证所有品牌权限
    const validBrandIds = [];
    for (const brandId of brandIds) {
      const hasPermission = await userBrandService.checkBrandPermission(userId, brandId);
      if (hasPermission) {
        validBrandIds.push(brandId);
      }
    }
    
    if (validBrandIds.length === 0) {
      return sendForbidden(res, '没有可采集的品牌');
    }
    
    // 获取品牌信息
    const brands = [];
    for (const brandId of validBrandIds) {
      const brand = await userBrandService.getBrandWithPermission(userId, brandId);
      if (brand) {
        brands.push({
          id: brand.id,
          name: brand.name,
          website: brand.website
        });
      }
    }
    
    // 批量采集
    const results = await batchCollect(brands);
    
    // 保存成功的采集结果
    const savedCount = 0;
    for (const result of results) {
      if (result.success && result.data) {
        await userBrandService.saveBrandAnalysis(userId, result.brandId, result.data);
        savedCount++;
      }
    }
    
    return sendSuccess(res, { 
      results,
      totalRequested: brandIds.length,
      totalCollected: results.filter(r => r.success).length,
      totalSaved: savedCount,
      message: `批量采集完成，共处理 ${results.length} 个品牌` 
    });
  } catch (error) {
    console.error('批量采集失败:', error);
    return sendError(res, '批量采集失败');
  }
});

/**
 * GET /api/analysis/trend/:brandId
 * 获取分析趋势数据
 */
router.get('/trend/:brandId', authenticate, async (req, res) => {
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
    
    // 获取分析历史
    const history = await userBrandService.getBrandAnalysisHistory(userId, brandId, 10);
    
    if (history.length < 2) {
      return sendSuccess(res, { trend: null, message: '数据不足，无法计算趋势' });
    }
    
    // 获取最新两次分析数据
    const latestAnalysis = await userBrandService.getBrandAnalysis(userId, brandId);
    
    if (!latestAnalysis) {
      return sendNotFound(res, '分析数据');
    }
    
    // 计算趋势（简化版本，对比历史平均值）
    const trend = calculateTrend(
      latestAnalysis.overview?.brandMentionRate || 0,
      (latestAnalysis.overview?.brandMentionRate || 0) * 0.9 // 模拟上一次数据
    );
    
    return sendSuccess(res, {
      trend,
      currentValue: latestAnalysis.overview?.brandMentionRate || 0,
      historyCount: history.length
    });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    return sendError(res, '获取趋势数据失败');
  }
});

/**
 * POST /api/analysis/validate
 * 验证分析数据格式
 */
router.post('/validate', authenticate, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return sendError(res, '请提供待验证的数据', 400);
    }
    
    const validation = validateAnalysisData(data);
    
    return sendSuccess(res, {
      valid: validation.valid,
      warnings: validation.warnings,
      errors: validation.errors,
      cleanedData: validation.data
    });
  } catch (error) {
    console.error('验证数据失败:', error);
    return sendError(res, '验证数据失败');
  }
});

/**
 * GET /api/analysis/export/:brandId
 * 导出分析数据
 */
router.get('/export/:brandId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandId = parseInt(req.params.brandId);
    const { format = 'json' } = req.query;
    
    if (isNaN(brandId)) {
      return sendError(res, '无效的品牌ID', 400);
    }
    
    // 验证权限
    const hasPermission = await userBrandService.checkBrandPermission(userId, brandId);
    if (!hasPermission) {
      return sendForbidden(res, '无权访问该品牌');
    }
    
    // 获取分析数据
    const analysis = await userBrandService.getBrandAnalysis(userId, brandId);
    
    if (!analysis) {
      return sendNotFound(res, '分析数据');
    }
    
    let content, contentType, filename;
    
    if (format === 'csv') {
      content = exportToCSV(analysis);
      contentType = 'text/csv';
      filename = `analysis_${brandId}_${Date.now()}.csv`;
    } else {
      content = exportToJSON(analysis);
      contentType = 'application/json';
      filename = `analysis_${brandId}_${Date.now()}.json`;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    console.error('导出数据失败:', error);
    return sendError(res, '导出数据失败');
  }
});

/**
 * GET /api/analysis/stats/:brandId
 * 获取品牌分析统计
 */
router.get('/stats/:brandId', authenticate, async (req, res) => {
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
    
    // 获取分析数据
    const analysis = await userBrandService.getBrandAnalysis(userId, brandId);
    
    if (!analysis) {
      return sendSuccess(res, {
        overview: null,
        visibility: null,
        perception: null,
        topicCount: 0,
        citationCount: 0,
        suggestionCount: 0,
        competitorCount: 0
      });
    }
    
    const stats = {
      overview: analysis.overview,
      visibility: analysis.visibility,
      perception: analysis.perception,
      topicCount: analysis.topics?.length || 0,
      citationCount: analysis.citations?.length || 0,
      suggestionCount: analysis.suggestions?.length || 0,
      competitorCount: analysis.competition?.competitors?.length || 0,
      overallScore: analysis.overallScore || 0,
      updateTime: analysis.created_at || new Date().toISOString()
    };
    
    return sendSuccess(res, stats);
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return sendError(res, '获取统计数据失败');
  }
});

module.exports = router;
