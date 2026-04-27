const express = require('express');
const router = express.Router();
const brandModel = require('../models/brand');
const promptService = require('../services/promptService');
const aiService = require('../services/aiService');

router.post('/', async (req, res) => {
  try {
    const { userId, name, website } = req.body;
    
    if (!userId || !name || !website) {
      return res.status(400).json({ success: false, error: '请填写品牌名称和网址' });
    }
    
    // 保存品牌到数据库（只需要必填字段）
    const brandId = await brandModel.createBrand(userId, name, website);
    
    res.status(200).json({
      success: true,
      brandId,
      brand: { id: brandId, name, website, status: 'pending' }
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
    const { selectedPromptIds, customPrompts, brandInfo } = req.body;

    console.log('=== 开始品牌分析请求 ===');
    console.log(`品牌ID: ${id}`);
    console.log(`选择的提示词ID: ${selectedPromptIds}`);
    console.log(`自定义提示词: ${customPrompts}`);
    console.log(`品牌信息: ${JSON.stringify(brandInfo)}`);

    // 执行AI分析，不依赖于数据库操作
    const analysisResult = await aiService.performAIAnalysis(id, brandInfo);

    console.log('分析结果:', JSON.stringify(analysisResult, null, 2));

    // 检查分析结果是否包含错误
    if (analysisResult.error) {
      console.error('分析失败:', analysisResult.error);
      return res.status(500).json({
        success: false,
        error: analysisResult.error.message,
        errorDetails: analysisResult.error
      });
    }

    if (analysisResult) {
      // 直接返回分析结果，不依赖于数据库
      console.log('分析成功，返回结果');
      return res.status(200).json({ success: true, analysis: analysisResult, message: '分析完成' });
    }

    res.status(200).json({ success: true, message: '分析已开始', status: 'analyzing' });
  } catch (error) {
    console.error('开始分析失败:', error);
    // 返回错误信息，确保前端能够正确显示错误
    res.status(500).json({
      success: false,
      error: '分析失败',
      errorDetails: {
        module: 'routes.brand',
        function: 'analyze',
        message: error.message,
        details: error.stack
      }
    });
  }
});

router.get('/:id/analysis-status', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 从数据库获取品牌状态
    const brand = await brandModel.getBrandById(id);
    if (!brand) {
      return res.status(404).json({ success: false, error: '品牌不存在' });
    }
    
    let status = brand.status;
    let progress = 0;
    let currentPrompt = '准备分析';
    
    switch (status) {
      case 'pending':
        progress = 0;
        currentPrompt = '准备分析';
        break;
      case 'analyzing':
        progress = 50;
        currentPrompt = '正在分析';
        break;
      case 'completed':
        progress = 100;
        currentPrompt = '分析完成';
        break;
      case 'failed':
        progress = 100;
        currentPrompt = '分析失败';
        break;
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
    
    // 从数据库获取分析结果
    const analysis = await brandModel.getAnalysisByBrandId(id);
    
    if (!analysis) {
      // 如果没有分析结果，执行新的分析
      const analysisResult = await aiService.performAIAnalysis(id);
      if (analysisResult) {
        const newAnalysis = await brandModel.getAnalysisByBrandId(id);
        if (newAnalysis) {
          return res.status(200).json({ success: true, analysis: newAnalysis });
        }
      }
      return res.status(404).json({ success: false, error: '分析结果不存在' });
    }
    
    return res.status(200).json({ success: true, analysis });
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

// 删除品牌
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 执行数据库删除操作
    await brandModel.deleteBrand(id);
    
    res.status(200).json({ success: true, message: '品牌删除成功' });
  } catch (error) {
    console.error('删除品牌失败:', error);
    res.status(500).json({ success: false, error: '删除品牌失败' });
  }
});

// 导出分析报告
router.get('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const { format } = req.query;
    
    // 从数据库获取分析结果
    const analysis = await brandModel.getAnalysisByBrandId(id);
    
    if (!analysis) {
      return res.status(404).json({ success: false, error: '分析结果不存在' });
    }
    
    // 解析分析结果
    const parsedAnalysis = {
      overview: typeof analysis.overview === 'string' ? JSON.parse(analysis.overview) : analysis.overview,
      visibility: typeof analysis.visibility === 'string' ? JSON.parse(analysis.visibility) : analysis.visibility,
      perception: typeof analysis.perception === 'string' ? JSON.parse(analysis.perception) : analysis.perception,
      strengths: typeof analysis.strengths === 'string' ? JSON.parse(analysis.strengths) : analysis.strengths,
      opportunities: typeof analysis.opportunities === 'string' ? JSON.parse(analysis.opportunities) : analysis.opportunities,
      competition: typeof analysis.competition === 'string' ? JSON.parse(analysis.competition) : analysis.competition,
      risks: typeof analysis.risks === 'string' ? JSON.parse(analysis.risks) : analysis.risks,
      topics: typeof analysis.topics === 'string' ? JSON.parse(analysis.topics) : analysis.topics,
      citations: typeof analysis.citations === 'string' ? JSON.parse(analysis.citations) : analysis.citations,
      snapshots: typeof analysis.snapshots === 'string' ? JSON.parse(analysis.snapshots) : analysis.snapshots,
      suggestions: typeof analysis.suggestions === 'string' ? JSON.parse(analysis.suggestions) : analysis.suggestions
    };
    
    // 根据格式导出
    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="brand-analysis-${id}.json"`);
        res.json(parsedAnalysis);
        break;
      case 'csv':
        // 生成CSV格式
        let csvContent = '类型,值\n';
        csvContent += `品牌名称,${parsedAnalysis.overview.brandName}\n`;
        csvContent += `所属行业,${parsedAnalysis.overview.industry}\n`;
        csvContent += `综合评分,${parsedAnalysis.overview.overallScore}\n`;
        csvContent += `可见度评分,${parsedAnalysis.visibility.overallVisibility}\n`;
        csvContent += `提及次数,${parsedAnalysis.visibility.mentionCount}\n`;
        csvContent += `正面评价,${parsedAnalysis.perception.positive}%\n`;
        csvContent += `中性评价,${parsedAnalysis.perception.neutral}%\n`;
        csvContent += `负面评价,${parsedAnalysis.perception.negative}%\n`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="brand-analysis-${id}.csv"`);
        res.send(csvContent);
        break;
      case 'txt':
      default:
        // 生成文本格式
        let txtContent = `品牌分析报告\n`;
        txtContent += `===================\n`;
        txtContent += `品牌名称: ${parsedAnalysis.overview.brandName}\n`;
        txtContent += `所属行业: ${parsedAnalysis.overview.industry}\n`;
        txtContent += `综合评分: ${parsedAnalysis.overview.overallScore}\n`;
        txtContent += `概述: ${parsedAnalysis.overview.summary}\n\n`;
        txtContent += `可见度分析:\n`;
        txtContent += `  可见度评分: ${parsedAnalysis.visibility.overallVisibility}\n`;
        txtContent += `  提及次数: ${parsedAnalysis.visibility.mentionCount}\n`;
        txtContent += `  环比变化: ${parsedAnalysis.visibility.weeklyChange}\n`;
        txtContent += `  行业排名: ${parsedAnalysis.visibility.industryRank}\n\n`;
        txtContent += `用户感知:\n`;
        txtContent += `  正面评价: ${parsedAnalysis.perception.positive}%\n`;
        txtContent += `  中性评价: ${parsedAnalysis.perception.neutral}%\n`;
        txtContent += `  负面评价: ${parsedAnalysis.perception.negative}%\n`;
        txtContent += `  核心关键词: ${parsedAnalysis.perception.keywords.join(', ')}\n\n`;
        txtContent += `品牌优势:\n`;
        if (parsedAnalysis.strengths && parsedAnalysis.strengths.length > 0) {
          parsedAnalysis.strengths.forEach((strength, index) => {
            txtContent += `  ${index + 1}. [${strength.impact}] ${strength.title}: ${strength.description}\n`;
          });
        } else {
          txtContent += `  暂无数据\n`;
        }
        txtContent += `\n`;
        txtContent += `市场机会:\n`;
        if (parsedAnalysis.opportunities && parsedAnalysis.opportunities.length > 0) {
          parsedAnalysis.opportunities.forEach((opportunity, index) => {
            txtContent += `  ${index + 1}. [${opportunity.potential}] ${opportunity.title}: ${opportunity.description}\n`;
          });
        } else {
          txtContent += `  暂无数据\n`;
        }
        txtContent += `\n`;
        txtContent += `竞争分析:\n`;
        if (parsedAnalysis.competition) {
          txtContent += `  竞争优势: ${parsedAnalysis.competition.competitiveAdvantage || '暂无数据'}\n`;
          if (parsedAnalysis.competition.competitors && parsedAnalysis.competition.competitors.length > 0) {
            txtContent += `  竞争对手:\n`;
            parsedAnalysis.competition.competitors.forEach((competitor, index) => {
              txtContent += `    ${index + 1}. ${competitor.name}\n`;
              txtContent += `      优势: ${competitor.strengths}\n`;
              txtContent += `      劣势: ${competitor.weaknesses}\n`;
            });
          }
        } else {
          txtContent += `  暂无数据\n`;
        }
        txtContent += `\n`;
        txtContent += `风险评估:\n`;
        if (parsedAnalysis.risks && parsedAnalysis.risks.length > 0) {
          parsedAnalysis.risks.forEach((risk, index) => {
            txtContent += `  ${index + 1}. [${risk.severity}] ${risk.title}: ${risk.description}\n`;
            txtContent += `    缓解措施: ${risk.mitigation}\n`;
          });
        } else {
          txtContent += `  暂无数据\n`;
        }
        txtContent += `\n`;
        txtContent += `建议:\n`;
        if (parsedAnalysis.suggestions && parsedAnalysis.suggestions.length > 0) {
          parsedAnalysis.suggestions.forEach((suggestion, index) => {
            txtContent += `  ${index + 1}. [${suggestion.priority}] ${suggestion.title}: ${suggestion.description}\n`;
          });
        } else {
          txtContent += `  暂无数据\n`;
        }
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="brand-analysis-${id}.txt"`);
        res.send(txtContent);
        break;
    }
  } catch (error) {
    console.error('导出报告失败:', error);
    res.status(500).json({ success: false, error: '导出报告失败' });
  }
});

module.exports = router;