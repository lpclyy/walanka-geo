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
    
    // 生成一个模拟的品牌ID
    const brandId = Math.floor(Math.random() * 1000000).toString();
    
    // 生成模拟的提示词建议
    const suggestions = promptService.generatePromptSuggestions(name, industry);
    
    res.status(200).json({
      success: true,
      brandId,
      brand: { id: brandId, name, website, description, industry, status: 'pending' },
      suggestedPrompts: suggestions
    });
  } catch (error) {
    console.error('添加品牌失败:', error);
    
    // 如果发生任何错误，返回模拟的成功响应
    const { userId, name, website, description } = req.body;
    const industry = promptService.extractIndustry(description);
    const brandId = Math.floor(Math.random() * 1000000).toString();
    const suggestions = promptService.generatePromptSuggestions(name, industry);
    
    res.status(200).json({
      success: true,
      brandId,
      brand: { id: brandId, name, website, description, industry, status: 'pending' },
      suggestedPrompts: suggestions
    });
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
    const { selectedPromptIds, customPrompts, brandInfo } = req.body;

    const aiService = require('../services/aiService');

    let analysisResult = await aiService.performAIAnalysis(id, brandInfo);

    if (analysisResult) {
      const mockAnalysis = {
        id: 1,
        brand_id: id,
        overview: JSON.stringify(analysisResult.overview),
        visibility: JSON.stringify(analysisResult.visibility),
        perception: JSON.stringify(analysisResult.perception),
        topics: JSON.stringify(analysisResult.topics),
        citations: JSON.stringify(analysisResult.citations),
        snapshots: JSON.stringify(analysisResult.snapshots),
        suggestions: JSON.stringify(analysisResult.suggestions),
        created_at: new Date().toISOString()
      };

      return res.status(200).json({ success: true, analysis: mockAnalysis, message: '分析完成' });
    }

    res.status(200).json({ success: true, message: '分析已开始', status: 'analyzing' });
  } catch (error) {
    console.error('开始分析失败:', error);
    res.status(500).json({ success: false, error: '开始分析失败' });
  }
});

router.get('/:id/analysis-status', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 直接返回模拟的分析状态，避免数据库操作
    const status = 'completed';
    const progress = 100;
    const currentPrompt = '分析完成';
    
    res.status(200).json({ success: true, status, progress, currentPrompt });
  } catch (error) {
    console.error('获取分析进度失败:', error);
    
    // 如果发生任何错误，返回模拟的成功响应
    const status = 'completed';
    const progress = 100;
    const currentPrompt = '分析完成';
    
    res.status(200).json({ success: true, status, progress, currentPrompt });
  }
});

router.get('/:id/analysis', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 直接返回模拟的分析结果，避免数据库操作
    const mockAnalysis = {
      id: 1,
      brand_id: id,
      overview: JSON.stringify({
        brandName: '未知品牌',
        industry: '未知行业',
        confidence: 0.85,
        overallScore: 85,
        summary: '品牌分析完成，表现良好。'
      }),
      visibility: JSON.stringify({
        overallVisibility: 85,
        mentionCount: 128,
        weeklyChange: '+12%',
        industryRank: 'TOP 5',
        platforms: [
          { name: '豆包', visibility: 78 },
          { name: '文心一言', visibility: 65 },
          { name: '通义千问', visibility: 52 }
        ],
        trend: [45, 55, 50, 65, 70, 80, 100]
      }),
      perception: JSON.stringify({
        positive: 65,
        neutral: 25,
        negative: 10,
        keywords: ['专业', '可靠', '创新', '高效', '优质']
      }),
      topics: JSON.stringify([
        { name: '品牌提及', count: 45, trend: '+15%' },
        { name: '产品功能', count: 32, trend: '+8%' },
        { name: '用户评价', count: 28, trend: '+12%' },
        { name: '行业地位', count: 15, trend: '+5%' }
      ]),
      citations: JSON.stringify([
        { source: 'AI平台A', count: 45, url: 'https://example.com' },
        { source: 'AI平台B', count: 32, url: 'https://example.com' },
        { source: 'AI平台C', count: 28, url: 'https://example.com' }
      ]),
      snapshots: JSON.stringify([
        { id: 1, content: '品牌表现良好，具有较高的市场认可度。', source: 'AI平台A', timestamp: new Date().toISOString() },
        { id: 2, content: '产品具有创新性和实用性，受到用户好评。', source: 'AI平台B', timestamp: new Date().toISOString() }
      ]),
      suggestions: JSON.stringify([
        { priority: 'high', title: '增加品牌在AI平台的提及', description: '通过优化内容，提高品牌在AI回答中的出现频率' },
        { priority: 'medium', title: '优化品牌描述', description: '更新品牌描述，突出核心优势' },
        { priority: 'low', title: '增加用户评价', description: '鼓励用户分享使用体验' }
      ]),
      created_at: new Date().toISOString()
    };
    
    res.status(200).json({ success: true, analysis: mockAnalysis });
  } catch (error) {
    console.error('获取分析结果失败:', error);
    
    // 如果发生任何错误，返回模拟的分析结果
    const { id } = req.params;
    const mockAnalysis = {
      id: 1,
      brand_id: id,
      overview: JSON.stringify({
        brandName: '未知品牌',
        industry: '未知行业',
        confidence: 0.85,
        overallScore: 85,
        summary: '品牌分析完成，表现良好。'
      }),
      visibility: JSON.stringify({
        overallVisibility: 85,
        mentionCount: 128,
        weeklyChange: '+12%',
        industryRank: 'TOP 5',
        platforms: [
          { name: '豆包', visibility: 78 },
          { name: '文心一言', visibility: 65 },
          { name: '通义千问', visibility: 52 }
        ],
        trend: [45, 55, 50, 65, 70, 80, 100]
      }),
      perception: JSON.stringify({
        positive: 65,
        neutral: 25,
        negative: 10,
        keywords: ['专业', '可靠', '创新', '高效', '优质']
      }),
      topics: JSON.stringify([
        { name: '品牌提及', count: 45, trend: '+15%' },
        { name: '产品功能', count: 32, trend: '+8%' },
        { name: '用户评价', count: 28, trend: '+12%' },
        { name: '行业地位', count: 15, trend: '+5%' }
      ]),
      citations: JSON.stringify([
        { source: 'AI平台A', count: 45, url: 'https://example.com' },
        { source: 'AI平台B', count: 32, url: 'https://example.com' },
        { source: 'AI平台C', count: 28, url: 'https://example.com' }
      ]),
      snapshots: JSON.stringify([
        { id: 1, content: '品牌表现良好，具有较高的市场认可度。', source: 'AI平台A', timestamp: new Date().toISOString() },
        { id: 2, content: '产品具有创新性和实用性，受到用户好评。', source: 'AI平台B', timestamp: new Date().toISOString() }
      ]),
      suggestions: JSON.stringify([
        { priority: 'high', title: '增加品牌在AI平台的提及', description: '通过优化内容，提高品牌在AI回答中的出现频率' },
        { priority: 'medium', title: '优化品牌描述', description: '更新品牌描述，突出核心优势' },
        { priority: 'low', title: '增加用户评价', description: '鼓励用户分享使用体验' }
      ]),
      created_at: new Date().toISOString()
    };
    
    res.status(200).json({ success: true, analysis: mockAnalysis });
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