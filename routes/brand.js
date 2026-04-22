const express = require('express');
const router = express.Router();
const brandModel = require('../models/brand');
const promptService = require('../services/promptService');
const aiService = require('../services/aiService');

router.post('/', async (req, res) => {
  try {
    const { userId, name, website, description } = req.body;
    
    if (!userId || !name || !website) {
      return res.status(400).json({ success: false, error: '请填写必填信息' });
    }
    
    const industry = promptService.extractIndustry(description);
    const brandId = await brandModel.createBrand(userId, name, website, description, industry);
    
    const suggestions = promptService.generatePromptSuggestions(name, industry);
    await brandModel.savePromptSuggestions(brandId, suggestions);
    
    const savedSuggestions = await brandModel.getPromptSuggestionsByBrandId(brandId);
    
    res.status(200).json({
      success: true,
      brandId,
      brand: { id: brandId, name, website, description, industry, status: 'pending' },
      suggestedPrompts: savedSuggestions
    });
  } catch (error) {
    console.error('添加品牌失败:', error);
    res.status(500).json({ success: false, error: '添加品牌失败' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: '缺少用户ID' });
    }
    
    const brands = await brandModel.getBrandsByUserId(userId);
    
    res.status(200).json({ success: true, brands });
  } catch (error) {
    console.error('获取品牌列表失败:', error);
    res.status(500).json({ success: false, error: '获取品牌列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const brand = await brandModel.getBrandById(id);
    
    if (!brand) {
      return res.status(404).json({ success: false, error: '品牌不存在' });
    }
    
    res.status(200).json({ success: true, brand });
  } catch (error) {
    console.error('获取品牌详情失败:', error);
    res.status(500).json({ success: false, error: '获取品牌详情失败' });
  }
});

router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedPromptIds, customPrompts } = req.body;
    
    await brandModel.updateBrandStatus(id, 'analyzing');
    
    await brandModel.saveSelectedPrompts(id, selectedPromptIds, customPrompts);
    
    aiService.performAIAnalysis(id);
    
    res.status(200).json({ success: true, message: '分析已开始', status: 'analyzing' });
  } catch (error) {
    console.error('开始分析失败:', error);
    res.status(500).json({ success: false, error: '开始分析失败' });
  }
});

router.get('/:id/analysis-status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const brand = await brandModel.getBrandById(id);
    
    if (!brand) {
      return res.status(404).json({ success: false, error: '品牌不存在' });
    }
    
    const status = brand.status;
    let progress = 0;
    let currentPrompt = '';
    
    if (status === 'completed') {
      progress = 100;
    } else if (status === 'analyzing') {
      progress = Math.floor(Math.random() * 80) + 10;
      currentPrompt = '正在分析品牌信息...';
    }
    
    res.status(200).json({ success: true, status, progress, currentPrompt });
  } catch (error) {
    console.error('获取分析进度失败:', error);
    res.status(500).json({ success: false, error: '获取分析进度失败' });
  }
});

router.get('/:id/analysis', async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await brandModel.getAnalysisByBrandId(id);
    
    if (!analysis) {
      return res.status(404).json({ success: false, error: '分析结果不存在' });
    }
    
    res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error('获取分析结果失败:', error);
    res.status(500).json({ success: false, error: '获取分析结果失败' });
  }
});

router.get('/:id/prompts', async (req, res) => {
  try {
    const { id } = req.params;
    
    const prompts = await brandModel.getPromptListByBrandId(id);
    
    res.status(200).json({ success: true, prompts });
  } catch (error) {
    console.error('获取提示词列表失败:', error);
    res.status(500).json({ success: false, error: '获取提示词列表失败' });
  }
});

router.post('/:id/prompts', async (req, res) => {
  try {
    const { id } = req.params;
    const { promptText, source } = req.body;
    
    if (!promptText) {
      return res.status(400).json({ success: false, error: '请输入提示词内容' });
    }
    
    await brandModel.addPromptToList(id, promptText, source);
    
    res.status(200).json({ success: true, message: '提示词添加成功' });
  } catch (error) {
    console.error('添加提示词失败:', error);
    res.status(500).json({ success: false, error: '添加提示词失败' });
  }
});

router.delete('/:id/prompts/:promptId', async (req, res) => {
  try {
    const { id, promptId } = req.params;
    
    await brandModel.deletePromptFromList(promptId, id);
    
    res.status(200).json({ success: true, message: '提示词删除成功' });
  } catch (error) {
    console.error('删除提示词失败:', error);
    res.status(500).json({ success: false, error: '删除提示词失败' });
  }
});

module.exports = router;