/**
 * 竞品分析服务模块
 * @module services/competitorService
 * @description 提供竞品品牌管理和分析功能
 */

const competitorModel = require('../models/competitor');
const axios = require('axios');
const { cleanThinkingTags, cleanJsonResponse } = require('./aiService');
require('dotenv').config();

/**
 * 添加竞品品牌
 * @param {number} userId - 用户ID
 * @param {number} brandId - 主品牌ID
 * @param {string} name - 竞品名称
 * @param {string} [website] - 竞品官网
 * @returns {Promise<Object>} 添加结果
 */
async function addCompetitor(userId, brandId, name, website = '') {
  try {
    const competitorId = await competitorModel.createCompetitor(userId, brandId, name, website);
    return { success: true, competitorId };
  } catch (error) {
    console.error('添加竞品失败:', error);
    return { success: false, message: '添加竞品失败', error: error.message };
  }
}

/**
 * 获取品牌的竞品列表
 * @param {number} brandId - 品牌ID
 * @returns {Promise<Array>} 竞品列表
 */
async function getCompetitors(brandId) {
  try {
    return await competitorModel.getCompetitorsByBrandId(brandId);
  } catch (error) {
    console.error('获取竞品列表失败:', error);
    return [];
  }
}

/**
 * 根据ID获取竞品
 * @param {number} competitorId - 竞品ID
 * @returns {Promise<Object|null>} 竞品对象
 */
async function getCompetitorById(competitorId) {
  try {
    return await competitorModel.getCompetitorById(competitorId);
  } catch (error) {
    console.error('获取竞品失败:', error);
    return null;
  }
}

/**
 * 删除竞品
 * @param {number} competitorId - 竞品ID
 * @returns {Promise<Object>} 删除结果
 */
async function removeCompetitor(competitorId) {
  try {
    await competitorModel.deleteCompetitor(competitorId);
    return { success: true };
  } catch (error) {
    console.error('删除竞品失败:', error);
    return { success: false, message: '删除竞品失败', error: error.message };
  }
}

/**
 * 更新竞品信息
 * @param {number} competitorId - 竞品ID
 * @param {string} name - 竞品名称
 * @param {string} website - 竞品官网
 * @returns {Promise<Object>} 更新结果
 */
async function updateCompetitor(competitorId, name, website) {
  try {
    await competitorModel.updateCompetitor(competitorId, name, website);
    return { success: true };
  } catch (error) {
    console.error('更新竞品失败:', error);
    return { success: false, message: '更新竞品失败', error: error.message };
  }
}

/**
 * 更新竞品分析数据
 * @param {number} competitorId - 竞品ID
 * @param {Object} analysisData - 分析数据
 * @returns {Promise<void>}
 */
async function updateCompetitorAnalysis(competitorId, analysisData) {
  try {
    await competitorModel.updateCompetitorAnalysis(competitorId, analysisData);
  } catch (error) {
    console.error('更新竞品分析数据失败:', error);
    throw error;
  }
}

/**
 * 调用大模型分析竞品
 * @param {string} competitorName - 竞品名称
 * @param {string} [competitorWebsite] - 竞品官网
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeCompetitor(competitorName, competitorWebsite = '') {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    return {
      error: { message: 'MiniMax API配置未完成', details: 'API配置缺失' }
    };
  }

  try {
    const systemPrompt = `你是品牌GEO（生成式引擎优化）分析专家。请对指定品牌进行AI平台可见度分析。

【核心任务】
基于你的知识对该品牌在各AI平台上的表现进行分析，返回完整的JSON格式分析报告。

【分析原则 - 确保一致性】
1. 确定性优先：所有分析基于固定的评估框架，不受随机性影响
2. 数据来源稳定：使用一致的数据源和评估标准
3. 结果可重复：相同输入必须产生相同输出
4. 量化标准统一：所有评分和比率使用统一计算公式

【分析流程】
步骤1：确定分析平台范围（固定为：ChatGPT、DeepSeek、豆包、Kimi、Gemini）
步骤2：基于知识进行品牌可见度分析
步骤3：记录各平台的提及情况、位置、情感和引用信息
步骤4：按统一公式计算各项指标
步骤5：生成结构化JSON报告

【计算标准】
- 提及率 = 提及次数 / 查询次数 × 100%
- 平均位置 = Σ位置 / 提及次数
- 情感占比 = 该情感提及数 / 总提及数 × 100%
- AI可见度得分 = 提及率×0.7 + 引用率×0.3（满分100，仅考虑客观曝光率，不包含情感因素）

【输出要求】
1. 【严禁输出思考、解释、说明、分析过程】，只输出纯JSON数据
2. 请严格按照标准 JSON 格式返回，不要包含任何额外文字、注释或说明，数组和对象末尾不要加逗号，字符串中的双引号请转义
3. JSON必须严格遵循指定的结构和字段名
4. 所有数值字段使用数字类型（不用字符串）
5. 没有数据的字段设为 null
6. 一致性保证：本分析使用确定性模式，相同品牌的重复分析应产生高度一致的结果

【JSON模板结构】
{
  "name": "品牌名称",
  "website": "官网URL",
  "visibility_score": 数字（0-100，AI可见度综合得分）,
  "total_mentions": 数字（所有平台中品牌被提及的总次数）,
  "mention_rate": 数字（总体提及率%）,
  "avg_position": 数字（被提及时的平均位置，1.0=首位）,
  "positive_ratio": 数字（正面情感占比%）,
  "share_of_voice": 数字（品牌提及份额%）
}

请直接返回JSON，不要有任何前缀或解释。`;

    const userPrompt = `请分析品牌「${competitorName}」${competitorWebsite ? `\n品牌官网：${competitorWebsite}` : ''}的AI平台可见度数据。`;

    const response = await axios.post(llmApiUrl, {
      model: llmModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      timeout: 120000
    });

    const content = response.data.choices?.[0]?.message?.content;
    
    if (!content) {
      return { error: { message: '大模型返回内容为空' } };
    }

    console.log('大模型返回原始内容:', content);

    // 使用aiService中的清理函数处理内容
    let cleanedContent = cleanThinkingTags(content);
    cleanedContent = cleanJsonResponse(cleanedContent);
    
    console.log('清理后的内容:', cleanedContent);
    
    try {
      const result = JSON.parse(cleanedContent);
      return { success: true, data: result };
    } catch (e) {
      console.error('解析竞品分析JSON失败:', e);
      console.error('原始内容:', content);
      console.error('清理后的内容:', cleanedContent);
      return { error: { message: '解析结果失败', details: e.message, rawContent: content.substring(0, 500) } };
    }

  } catch (error) {
    console.error('竞品分析失败:', error);
    return {
      error: {
        message: '竞品分析失败',
        details: error.response?.data?.message || error.message
      }
    };
  }
}

/**
 * 批量分析竞品
 * @param {Array} competitors - 竞品列表
 * @returns {Promise<Array>} 分析结果列表
 */
async function analyzeCompetitors(competitors) {
  const results = [];
  
  for (const competitor of competitors) {
    const result = await analyzeCompetitor(competitor.name, competitor.website);
    if (result.success) {
      // 更新数据库
      await competitorModel.updateCompetitorAnalysis(competitor.id, result.data);
      results.push({ ...competitor, ...result.data });
    } else {
      results.push({ ...competitor, error: result.error });
    }
  }
  
  return results;
}

/**
 * 生成竞品对比洞察
 * @param {Object} brandData - 主品牌数据
 * @param {Array} competitorsData - 竞品数据列表
 * @returns {Promise<string>} 对比洞察文本
 */
async function generateCompetitorInsight(brandData, competitorsData) {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    return 'AI配置未完成，无法生成洞察分析';
  }

  try {
    const competitorsText = competitorsData.map((c, i) => 
      `${i + 1}. ${c.name}: 可见度${c.visibility_score}分, 提及率${c.mention_rate}%, 平均位置${c.avg_position}, 正面占比${c.positive_ratio}%`
    ).join('\n');

    const prompt = `请根据以下品牌数据生成竞品对比洞察分析（200-300字）：

本品牌：${brandData.name || '品牌'}
- 可见度得分：${brandData.visibility_score || brandData.ai_visibility_score || 0}
- 提及率：${brandData.mention_rate || brandData.visibility_rate || 0}%
- 平均位置：${brandData.avg_position || '-'}
- 正面情感占比：${brandData.positive_ratio || 0}%

竞品列表：
${competitorsText}

请分析：
1. 本品牌与各竞品相比的优劣势
2. 在哪些指标上领先/落后
3. 针对性竞争策略建议

输出要求：直接输出洞察文本，不要包含其他格式。`;

    const response = await axios.post(llmApiUrl, {
      model: llmModel,
      messages: [
        { role: 'system', content: '你是专业的品牌竞争分析专家，擅长对比分析和策略建议。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      timeout: 60000
    });

    return response.data.choices?.[0]?.message?.content || '生成洞察失败';

  } catch (error) {
    console.error('生成竞品洞察失败:', error);
    return '生成洞察失败';
  }
}

module.exports = {
  addCompetitor,
  getCompetitors,
  getCompetitorById,
  removeCompetitor,
  updateCompetitor,
  analyzeCompetitor,
  analyzeCompetitors,
  updateCompetitorAnalysis,
  generateCompetitorInsight
};