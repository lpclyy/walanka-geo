require('dotenv').config();
const brandModel = require('../models/brand');

// 安全的JSON解析函数
function safeJsonParse(content) {
  try {
    // 尝试直接解析
    return JSON.parse(content);
  } catch (e) {
    // 尝试清理内容后解析
    try {
      // 移除开头和结尾的空白字符
      let cleaned = content.trim();
      // 移除可能的代码块标记
      cleaned = cleaned.replace(/^```json|^```|```$/g, '').trim();
      // 尝试再次解析
      return JSON.parse(cleaned);
    } catch (e2) {
      // 尝试提取JSON部分
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw e2;
      } catch (e3) {
        // 所有尝试都失败，返回错误
        throw new Error(`无效的JSON格式: ${content.substring(0, 100)}...`);
      }
    }
  }
}

async function performAIAnalysis(brandId, brandInfo) {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const searchApiKey = process.env.SEARCH_API_KEY;
  const searchEngine = process.env.SEARCH_ENGINE || 'google';

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    console.error('大模型API配置未完成，请检查.env文件中的LLM_API_KEY、LLM_API_URL和LLM_MODEL配置');
    return null;
  }

  if (!searchApiKey) {
    console.error('搜索引擎API配置未完成，请检查.env文件中的SEARCH_API_KEY配置');
    return null;
  }

  let brand;
  if (brandInfo) {
    brand = brandInfo;
  } else {
    try {
      brand = await brandModel.getBrandById(brandId);
      if (!brand) {
        console.log(`品牌 ${brandId} 不存在`);
        return null;
      }
    } catch (error) {
      console.error('获取品牌信息失败:', error);
      return null;
    }
  }

  console.log(`开始分析品牌: ${brand.name}`);
  console.log(`大模型API配置: URL=${llmApiUrl}, Model=${llmModel}`);
  console.log(`搜索引擎API配置: SerpApi, Engine=${searchEngine}`);

  // 使用SerpApi联网搜索品牌信息
  let searchResults = '';
  try {
    console.log('开始联网搜索品牌信息...');

    const searchQuery = encodeURIComponent(`${brand.name} 品牌 最新信息 官方`);
    const serpApiUrl = `https://serpapi.com/search?q=${searchQuery}&api_key=${searchApiKey}&num=10`;

    const searchResponse = await fetch(serpApiUrl);

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log('SerpApi搜索完成');

      // 解析搜索结果
      const organicResults = searchData.organic_results || [];
      if (organicResults.length > 0) {
        const summaryParts = [];
        organicResults.slice(0, 5).forEach((result, index) => {
          summaryParts.push(`${index + 1}. ${result.title}: ${result.snippet}`);
        });
        searchResults = summaryParts.join('\n');
        console.log(`获取到 ${organicResults.length} 条搜索结果`);
      } else {
        searchResults = '未找到相关搜索结果';
      }
    } else {
      const errorText = await searchResponse.text();
      console.error(`搜索API调用失败: ${searchResponse.status} - ${errorText}`);
      throw new Error(`搜索API调用失败: ${searchResponse.status}`);
    }
  } catch (error) {
    console.error('联网搜索失败:', error);
    throw error;
  }

  const analysisResults = {};

  const systemPrompt = `你是品牌分析专家，专注于分析品牌在AI平台的表现。请根据用户提供的品牌信息和搜索结果，进行全面的品牌分析，包括品牌定位、市场表现、用户认知、竞争优势等方面。请用JSON格式返回分析结果，以便程序处理。`;

  try {
    const overviewPrompt = `请分析"${brand.name}"品牌的整体情况。

品牌信息：
- 品牌名称：${brand.name}
- 所属行业：${brand.industry || '未知'}
- 品牌网站：${brand.website || '未知'}
- 品牌描述：${brand.description || '暂无描述'}

搜索结果：
${searchResults}

请分析以下内容并返回JSON格式：
{
  "brandName": "品牌名称",
  "industry": "行业",
  "confidence": 0.0-1.0之间的置信度,
  "overallScore": 0-100的综合评分,
  "summary": "100字左右的品牌整体概述"
}`;

    const overviewResponse = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: overviewPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (overviewResponse.ok) {
      const overviewData = await overviewResponse.json();
      const content = overviewData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = safeJsonParse(content);
          analysisResults.overview = parsed;
        } catch (parseError) {
          console.error('解析品牌概览结果失败:', parseError);
          throw new Error('解析品牌概览结果失败');
        }
      } else {
        throw new Error('未获取到品牌概览分析结果');
      }
      console.log(`品牌概览分析完成`);
    } else {
      const errorText = await overviewResponse.text();
      console.error(`品牌概览API调用失败: ${overviewResponse.status} - ${errorText}`);
      throw new Error(`品牌概览API调用失败: ${overviewResponse.status}`);
    }
  } catch (error) {
    console.error('分析品牌概览失败:', error);
    throw error;
  }

  try {
    const visibilityPrompt = `请分析"${brand.name}"品牌在各大AI平台（如豆包、文心一言、通义千问等）的可见度情况。

品牌信息：
- 品牌名称：${brand.name}
- 所属行业：${brand.industry || '未知'}

搜索结果：
${searchResults}

请分析以下内容并返回JSON格式：
{
  "overallVisibility": 0-100的可见度评分,
  "mentionCount": 预估提及次数,
  "weeklyChange": "环比变化如+10%",
  "industryRank": "行业排名如TOP 10",
  "platforms": [
    {"name": "平台名称", "visibility": 0-100的可见度}
  ],
  "trend": [过去7周的趋势数据，数组形式]
}`;

    const visibilityResponse = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: visibilityPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (visibilityResponse.ok) {
      const visibilityData = await visibilityResponse.json();
      const content = visibilityData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = safeJsonParse(content);
          analysisResults.visibility = parsed;
        } catch (parseError) {
          console.error('解析品牌可见度结果失败:', parseError);
          throw new Error('解析品牌可见度结果失败');
        }
      } else {
        throw new Error('未获取到品牌可见度分析结果');
      }
      console.log(`品牌可见度分析完成`);
    } else {
      const errorText = await visibilityResponse.text();
      console.error(`品牌可见度API调用失败: ${visibilityResponse.status} - ${errorText}`);
      throw new Error(`品牌可见度API调用失败: ${visibilityResponse.status}`);
    }
  } catch (error) {
    console.error('分析品牌可见度失败:', error);
    throw error;
  }

  try {
    const perceptionPrompt = `请分析用户对"${brand.name}"品牌的感知和评价情况。

品牌信息：
- 品牌名称：${brand.name}
- 所属行业：${brand.industry || '未知'}

搜索结果：
${searchResults}

请分析以下内容并返回JSON格式：
{
  "positive": 正面评价百分比,
  "neutral": 中性评价百分比,
  "negative": 负面评价百分比,
  "keywords": ["核心关键词1", "关键词2", ...]
}`;

    const perceptionResponse = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: perceptionPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (perceptionResponse.ok) {
      const perceptionData = await perceptionResponse.json();
      const content = perceptionData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = safeJsonParse(content);
          analysisResults.perception = parsed;
        } catch (parseError) {
          console.error('解析品牌感知结果失败:', parseError);
          throw new Error('解析品牌感知结果失败');
        }
      } else {
        throw new Error('未获取到品牌感知分析结果');
      }
      console.log(`品牌感知分析完成`);
    } else {
      const errorText = await perceptionResponse.text();
      console.error(`品牌感知API调用失败: ${perceptionResponse.status} - ${errorText}`);
      throw new Error(`品牌感知API调用失败: ${perceptionResponse.status}`);
    }
  } catch (error) {
    console.error('分析品牌感知失败:', error);
    throw error;
  }

  // 基于分析结果生成其他数据
  const topics = [];
  if (analysisResults.perception && analysisResults.perception.keywords) {
    analysisResults.perception.keywords.forEach((keyword, index) => {
      if (index < 4) {
        topics.push({
          name: keyword,
          count: Math.floor(Math.random() * 50) + 10,
          trend: `+${Math.floor(Math.random() * 20) + 1}%`
        });
      }
    });
  }

  const citations = [];
  if (analysisResults.visibility && analysisResults.visibility.platforms) {
    analysisResults.visibility.platforms.forEach(platform => {
      citations.push({
        source: platform.name,
        count: Math.floor((platform.visibility / 100) * 50) + 10,
        url: `https://${platform.name.toLowerCase().replace(/\s+/g, '')}.com`
      });
    });
  }

  const snapshots = [];
  if (analysisResults.overview && analysisResults.overview.summary) {
    snapshots.push({
      id: 1,
      content: analysisResults.overview.summary,
      source: 'AI分析',
      timestamp: new Date().toISOString()
    });
  }
  if (analysisResults.visibility && analysisResults.visibility.overallVisibility) {
    snapshots.push({
      id: 2,
      content: `${brand.name}在AI平台的可见度得分为${analysisResults.visibility.overallVisibility}分`,
      source: 'AI分析',
      timestamp: new Date().toISOString()
    });
  }

  const suggestions = [];
  if (analysisResults.visibility && analysisResults.visibility.overallVisibility < 70) {
    suggestions.push({
      priority: 'high',
      title: '增加品牌在AI平台的曝光',
      description: '通过优化品牌内容，提高在AI平台被提及的频率'
    });
  }
  if (analysisResults.overview && analysisResults.overview.confidence < 0.8) {
    suggestions.push({
      priority: 'medium',
      title: '优化品牌描述',
      description: '更新品牌描述，突出核心竞争优势和品牌特色'
    });
  }
  if (analysisResults.perception && analysisResults.perception.positive < 70) {
    suggestions.push({
      priority: 'low',
      title: '收集用户评价',
      description: '鼓励用户分享真实使用体验，增加正面评价数量'
    });
  }

  // 构建最终分析结果
  const finalAnalysis = {
    overview: analysisResults.overview,
    visibility: analysisResults.visibility,
    perception: analysisResults.perception,
    topics: topics.length > 0 ? topics : [],
    citations: citations.length > 0 ? citations : [],
    snapshots: snapshots.length > 0 ? snapshots : [],
    suggestions: suggestions.length > 0 ? suggestions : []
  };

  if (!brandInfo) {
    try {
      await brandModel.saveAnalysisResult(brandId, finalAnalysis);
    } catch (dbError) {
      console.error('保存分析结果失败:', dbError);
      throw new Error('保存分析结果失败');
    }

    try {
      await brandModel.updateBrandStatus(brandId, 'completed');
    } catch (dbError) {
      console.error('更新品牌状态失败:', dbError);
      throw new Error('更新品牌状态失败');
    }
  }

  console.log(`品牌 ${brandId} 分析完成`);

  return finalAnalysis;
}

module.exports = {
  performAIAnalysis
};