/**
 * 竞品分析路由模块
 * @module routes/competitor
 * @description 提供竞品管理和分析的API接口
 */

const express = require('express');
const router = express.Router();
const competitorService = require('../services/competitorService');

// 添加竞品品牌
router.post('/', async (req, res) => {
  try {
    const { userId, brandId, name, website } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '用户ID不能为空' });
    }
    
    if (!brandId || !name) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const result = await competitorService.addCompetitor(userId, brandId, name, website);
    res.json(result);
  } catch (error) {
    console.error('添加竞品失败:', error);
    res.status(500).json({ success: false, message: '添加竞品失败', error: error.message });
  }
});

// 获取品牌的竞品列表
router.get('/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const competitors = await competitorService.getCompetitors(brandId);
    res.json({ success: true, data: competitors });
  } catch (error) {
    console.error('获取竞品列表失败:', error);
    res.status(500).json({ success: false, message: '获取竞品列表失败', error: error.message });
  }
});

// 删除竞品
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await competitorService.removeCompetitor(id);
    res.json(result);
  } catch (error) {
    console.error('删除竞品失败:', error);
    res.status(500).json({ success: false, message: '删除竞品失败', error: error.message });
  }
});

// 更新竞品信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, website } = req.body;
    
    const result = await competitorService.updateCompetitor(id, name, website);
    res.json(result);
  } catch (error) {
    console.error('更新竞品失败:', error);
    res.status(500).json({ success: false, message: '更新竞品失败', error: error.message });
  }
});

// 分析单个竞品
router.post('/analyze/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const competitor = await competitorService.getCompetitorById(id);
    
    if (!competitor) {
      return res.status(404).json({ success: false, message: '竞品不存在' });
    }

    const result = await competitorService.analyzeCompetitor(competitor.name, competitor.website);
    
    if (result.success) {
      // 保存分析结果到数据库
      await competitorService.updateCompetitorAnalysis(id, result.data);
    }
    
    res.json(result);
  } catch (error) {
    console.error('分析竞品失败:', error);
    res.status(500).json({ success: false, message: '分析竞品失败', error: error.message });
  }
});

// 批量分析竞品
router.post('/batch-analyze/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const competitors = await competitorService.getCompetitors(brandId);
    
    if (competitors.length === 0) {
      return res.json({ success: true, data: [], message: '暂无竞品数据' });
    }

    const results = await competitorService.analyzeCompetitors(competitors);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('批量分析竞品失败:', error);
    res.status(500).json({ success: false, message: '批量分析竞品失败', error: error.message });
  }
});

// 生成竞品对比洞察
router.post('/insight/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const { brandData } = req.body;
    
    const competitors = await competitorService.getCompetitors(brandId);
    
    if (competitors.length === 0) {
      return res.json({ success: true, insight: '无竞品数据' });
    }

    const insight = await competitorService.generateCompetitorInsight(brandData, competitors);
    res.json({ success: true, insight });
  } catch (error) {
    console.error('生成竞品洞察失败:', error);
    res.status(500).json({ success: false, message: '生成竞品洞察失败', error: error.message });
  }
});

module.exports = router;