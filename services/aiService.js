/**
 * AI服务模块
 * @module services/aiService
 * @description 提供品牌分析、提示词分析、文章生成等AI相关功能
 * 调用用户的OpenClaw智能体获取数据，智能体以模板格式返回
 */

require('dotenv').config();
const brandModel = require('../models/brand');

/**
 * 调用OpenClaw智能体进行品牌分析
 * @param {number} brandId - 品牌ID
 * @param {Object} brandInfo - 品牌信息
 * @param {string} [customAgentId] - 自定义Agent ID
 * @returns {Promise<Object>} 分析结果
 */
async function performAIAnalysis(brandId, brandInfo, customAgentId = '') {
  const startTime = new Date();
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = customAgentId || process.env.LLM_AGENT;

  console.log('========================================');
  console.log(`[品牌分析开始] ${startTime.toLocaleString()}`);
  console.log(`品牌ID: ${brandId}`);
  console.log(`Agent ID: ${agentId || '默认Agent'}`);

  // 验证API配置
  if (!llmApiKey || !llmApiUrl || !llmModel) {
    const error = '大模型API配置未完成，请检查.env文件中的LLM_API_KEY、LLM_API_URL和LLM_MODEL配置';
    console.error(`[错误] ${error}`);
    console.log('========================================');
    return {
      error: {
        module: 'aiService.performAIAnalysis',
        function: 'performAIAnalysis',
        message: error,
        details: 'API配置缺失'
      }
    };
  }

  console.log('API配置验证通过');

  // 验证品牌信息
  let brand;
  if (brandInfo && brandInfo.name) {
    brand = brandInfo;
    console.log(`使用传入的品牌信息: ${brand.name}`);
  } else {
    try {
      console.log('从数据库获取品牌信息...');
      brand = await brandModel.getBrandById(brandId);
      if (!brand) {
        const error = `品牌 ${brandId} 不存在`;
        console.error(`[错误] ${error}`);
        console.log('========================================');
        return {
          error: {
            module: 'aiService.performAIAnalysis',
            function: 'getBrandById',
            message: error,
            details: '品牌不存在'
          }
        };
      }
      console.log(`数据库获取品牌成功: ${brand.name}`);
    } catch (error) {
      console.error(`[错误] 获取品牌信息失败: ${error.message}`);
      console.log('========================================');
      return {
        error: {
          module: 'aiService.performAIAnalysis',
          function: 'getBrandById',
          message: '获取品牌信息失败',
          details: error.message
        }
      };
    }
  }

  // 验证品牌名称存在
  if (!brand.name) {
    const error = '品牌名称不能为空';
    console.error(`[错误] ${error}`);
    console.log('========================================');
    return {
      error: {
        module: 'aiService.performAIAnalysis',
        function: 'validateBrand',
        message: error,
        details: 'brand.name 为空'
      }
    };
  }

  console.log(`开始调用智能体分析品牌: ${brand.name}`);
  console.log(`品牌网站: ${brand.website || '未知'}`);

  // 使用用户提供的geo模板格式调用智能体，返回JSON格式
  try {
    // 构建强制JSON格式的提示词
    const analysisPrompt = `## 任务要求
请使用您的GEO智能体分析"${brand.name}"品牌，并**严格按照以下JSON格式返回结果**。

## 格式要求
1. 返回必须是**纯JSON字符串**，不包含任何其他文本、解释或说明
2. 不允许返回Markdown格式、代码块标记或其他格式
3. 如果某项数据暂无，则保留模板中的"暂无数据"或0值
4. 必须保证JSON格式有效，可直接被JSON.parse()解析

## 返回模板
{
  "brandName": "${brand.name}",
  "officialWebsite": "${brand.website || '未知'}",
  "updateTime": "${new Date().toISOString().slice(0, 19).replace('T', ' ')}",
  "overview": {
    "aiPlatformCount": 0,
    "queryCount": 0,
    "brandMentionRate": 0,
    "positiveSentimentRate": 0,
    "officialCitationRate": 0,
    "dataSourceNote": "数据采集进行中，暂未获取到数据",
    "overallScore": 0,
    "confidence": 0,
    "summary": "暂无分析数据",
    "industry": "未知",
    "brandName": "${brand.name}"
  },
  "aiVisibility": [
    {"platform": "豆包", "mentionCount": 0, "totalQueries": 0, "mentionRate": 0, "remark": "暂无数据"},
    {"platform": "千问", "mentionCount": 0, "totalQueries": 0, "mentionRate": 0, "remark": "暂无数据"},
    {"platform": "文心一言", "mentionCount": 0, "totalQueries": 0, "mentionRate": 0, "remark": "暂无数据"},
    {"platform": "讯飞星火", "mentionCount": 0, "totalQueries": 0, "mentionRate": 0, "remark": "暂无数据"},
    {"platform": "ChatGPT", "mentionCount": 0, "totalQueries": 0, "mentionRate": 0, "remark": "暂无数据"},
    {"platform": "Gemini", "mentionCount": 0, "totalQueries": 0, "mentionRate": 0, "remark": "暂无数据"}
  ],
  "visibility": {
    "overallVisibility": 0,
    "mentionCount": 0,
    "weeklyChange": "0%",
    "industryRank": "-",
    "platforms": []
  },
  "perception": {
    "positive": 0,
    "neutral": 0,
    "negative": 0
  },
  "visibilityNote": "基于搜索引擎实时结果分析",
  "visibilityCoreFinding": "分析进行中，暂无核心发现",
  "officialPositioning": {
    "source": "${brand.website || '未知'}",
    "mission": "暂无数据",
    "coreBusiness": "暂无数据",
    "userScale": "暂无数据",
    "brandUpgrade": "暂无数据"
  },
  "keywords": [{"keyword": "暂无数据", "frequency": 0}],
  "perceptionDifferences": ["暂无数据"],
  "searchAssociations": [
    {"type": "品牌+服务", "example": "暂无数据"},
    {"type": "品牌+竞争", "example": "暂无数据"},
    {"type": "品牌+问题", "example": "暂无数据"},
    {"type": "品牌+AI", "example": "暂无数据"}
  ],
  "brandHomeShare": 0,
  "serviceHomeShare": 0,
  "competitionHomeShare": 0,
  "sentimentDistribution": {
    "positive": 0,
    "neutral": 0,
    "negative": 0,
    "positiveChange": "0%",
    "neutralChange": "0%",
    "negativeChange": "0%"
  },
  "typicalKeywords": {},
  "positiveExample": "暂无数据",
  "positiveSources": [],
  "negativeExample": "暂无数据",
  "negativeSources": [],
  "topics": [{"name": "暂无数据", "count": 0, "trend": "稳定"}],
  "citations": [{"source": "暂无数据", "count": 0}],
  "citationSources": [{"type": "官网引用", "percentage": 0, "representative": "暂无数据"}],
  "citationHabits": {},
  "prompts": [],
  "answerSnapshot": {"question": "暂无数据", "source": "暂无数据", "excerpt": "暂无数据"},
  "competitors": [],
  "suggestions": [{"priority": "P2", "title": "暂无建议", "description": "暂无建议内容"}]
}`;

    try {
      const response = await fetch(llmApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmApiKey}`
        },
        body: JSON.stringify({
          model: llmModel,
          agent: agentId || '',
          messages: [
            {
              role: 'system',
              content: '你是一位专业的品牌分析专家，使用GEO智能体进行品牌分析。请严格按照用户提供的模板格式返回分析结果。'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 8000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = `OpenClaw智能体调用失败: ${response.status} - ${errorText}`;
        console.error('错误:', error);
        return {
          error: {
            module: 'aiService.performAIAnalysis',
            function: 'fetch',
            message: error,
            details: `HTTP状态码: ${response.status}`
          }
        };
      }

      const responseData = await response.json();
      const content = responseData.choices?.[0]?.message?.content;
      if (!content) {
        const error = 'OpenClaw智能体返回内容为空';
        console.error('错误:', error);
        return {
          error: {
            module: 'aiService.performAIAnalysis',
            function: 'response processing',
            message: error,
            details: '智能体未返回任何内容'
          }
        };
      }

      console.log('智能体返回内容已接收，开始解析...');
      console.log(`返回内容长度: ${content.length} 字符`);
      
      // 打印智能体返回的原始内容（前2000字符，避免日志过长）
      console.log('----------------------------------------');
      console.log('[智能体原始返回内容]');
      console.log('----------------------------------------');
      console.log(content.length > 2000 ? content.substring(0, 2000) + '...(内容已截断)' : content);
      console.log('----------------------------------------');

      // 从文本中提取JSON部分
      const extractJSON = (text) => {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
          return text.substring(firstBrace, lastBrace + 1);
        }
        return null;
      };

      // 解析JSON数据
      let parsedData;
      let parseSuccess = false;
      let parseError = null;
      
      try {
        parsedData = JSON.parse(content);
        console.log('[解析步骤] JSON直接解析成功');
        parseSuccess = true;
      } catch (error) {
        parseError = `JSON直接解析失败: ${error.message}`;
        console.warn(`[解析步骤] ${parseError}`);
        console.log('[解析步骤] 尝试从文本中提取JSON部分...');
        
        // 尝试提取JSON
        const extracted = extractJSON(content);
        if (extracted) {
          console.log(`[解析步骤] 提取到JSON片段，长度: ${extracted.length} 字符`);
          console.log('[提取的JSON片段]');
          console.log(extracted.length > 1500 ? extracted.substring(0, 1500) + '...' : extracted);
          try {
            parsedData = JSON.parse(extracted);
            console.log('[解析步骤] 提取的JSON解析成功');
            parseSuccess = true;
          } catch (extractError) {
            parseError = `提取的JSON解析失败: ${extractError.message}`;
            console.error(`[解析步骤] ${parseError}`);
            console.log('[解析步骤] 使用默认空数据结构');
            parsedData = null;
          }
        } else {
          parseError = '未找到有效的JSON结构';
          console.log(`[解析步骤] ${parseError}，使用默认空数据结构`);
          parsedData = null;
        }
      }

      // 如果解析失败，使用默认数据结构
      if (!parsedData) {
        parsedData = getDefaultAnalysisData(brand.name, brand.website);
        console.log('[数据填充] 已使用默认空数据结构 - 智能体未返回有效数据');
      }

      // 验证品牌名称
      if (!parsedData.brandName) {
        console.log(`[数据修正] 品牌名称为空，使用原始品牌名: ${brand.name}`);
        parsedData.brandName = brand.name;
      }
      
      // 确保所有必要字段存在
      console.log('[数据处理] 确保所有必要字段存在...');
      parsedData = ensureRequiredFields(parsedData);

      // 打印最终解析结果摘要
      console.log('----------------------------------------');
      console.log('[最终解析结果摘要]');
      console.log(`解析成功: ${parseSuccess}`);
      if (parseError) {
        console.log(`错误信息: ${parseError}`);
      }
      console.log(`品牌名称: ${parsedData.brandName}`);
      console.log(`概览数据: ${JSON.stringify(parsedData.overview)}`);
      console.log(`AI可见度平台数: ${parsedData.aiVisibility?.length || 0}`);
      console.log(`热门主题数: ${parsedData.topics?.length || 0}`);
      console.log(`建议数: ${parsedData.suggestions?.length || 0}`);
      console.log('----------------------------------------');

      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);

      console.log('========================================');
      console.log(`[分析完成] ${endTime.toLocaleString()}`);
      console.log(`耗时: ${duration} 秒`);
      console.log(`品牌名称: ${parsedData.brandName}`);
      console.log(`解析成功: ${parseSuccess}`);
      console.log('========================================');

      return parsedData;

    } catch (error) {
      console.log('========================================');
      console.error(`[错误] 调用OpenClaw智能体失败: ${error.message}`);
      console.log('========================================');
      return {
        error: {
          module: 'aiService.performAIAnalysis',
          function: 'API call',
          message: '调用OpenClaw智能体失败',
          details: error.message
        }
      };
    }
  } catch (error) {
    console.log('========================================');
    console.error(`[错误] 品牌分析流程失败: ${error.message}`);
    console.log('========================================');
    return {
      error: {
        module: 'aiService.performAIAnalysis',
        function: 'main',
        message: '品牌分析流程失败',
        details: error.message
      }
    };
  }
}

/**
 * 提示词分析
 * @param {number} brandId - 品牌ID
 * @param {Object} brandInfo - 品牌信息
 * @param {Array} prompts - 提示词列表
 * @param {string} [customAgentId] - 自定义Agent ID
 * @returns {Promise<Object>} 分析结果
 */
async function performPromptAnalysis(brandId, brandInfo, prompts, customAgentId = '') {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = customAgentId || process.env.LLM_AGENT || '';

  console.log('=== 开始提示词分析流程 ===');
  console.log(`品牌ID: ${brandId}`);
  console.log(`提示词列表: ${JSON.stringify(prompts)}`);
  console.log(`Agent ID: ${agentId}`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    const error = '大模型API配置未完成';
    console.error('错误:', error);
    return {
      error: {
        module: 'aiService.performPromptAnalysis',
        function: 'performPromptAnalysis',
        message: error,
        details: 'API配置缺失'
      }
    };
  }

  let brand = brandInfo || await brandModel.getBrandById(brandId);
  if (!brand) {
    return { error: { message: '品牌不存在' } };
  }

  console.log(`开始分析提示词，品牌: ${brand.name}`);

  try {
    const promptList = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n');
    const promptAnalysisRequest = `请分析"${brand.name}"品牌在以下提示词下的表现：

品牌信息：
- 品牌名称：${brand.name}
- 品牌网站：${brand.website || '未知'}

提示词列表：
${promptList}

请对每个提示词进行详细分析，包括：
1. 提示词的预期用途
2. 品牌在该提示词下的表现评估
3. 相关的优化建议

请按照JSON格式返回结果。`;

    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        agent: agentId || '',
        messages: [
          {
            role: 'system',
            content: '你是品牌分析专家，专注于分析品牌在不同提示词下的表现。'
          },
          {
            role: 'user',
            content: promptAnalysisRequest
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: { message: `提示词分析API调用失败: ${response.status} - ${errorText}` }
      };
    }

    const responseData = await response.json();
    const content = responseData.choices?.[0]?.message?.content;
    
    if (!content) {
      return { error: { message: '大模型返回内容为空' } };
    }

    try {
      return JSON.parse(content);
    } catch {
      return { promptAnalysis: [], rawContent: content };
    }
  } catch (error) {
    return { error: { message: '提示词分析失败', details: error.message } };
  }
}

/**
 * 文章生成
 * @param {number} brandId - 品牌ID
 * @param {Object} brandInfo - 品牌信息
 * @param {Object} articleRequirements - 文章需求
 * @param {string} [customAgentId] - 自定义Agent ID
 * @returns {Promise<Object>} 生成结果
 */
async function generateArticle(brandId, brandInfo, articleRequirements, customAgentId = '') {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = customAgentId || process.env.LLM_AGENT || '';

  console.log('=== 开始文章生成流程 ===');
  console.log(`品牌ID: ${brandId}`);
  console.log(`文章需求: ${JSON.stringify(articleRequirements)}`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    return { error: { message: '大模型API配置未完成' } };
  }

  let brand = brandInfo || await brandModel.getBrandById(brandId);
  if (!brand) {
    return { error: { message: '品牌不存在' } };
  }

  const { title, topic, style, length } = articleRequirements;
  const articleRequest = `请为"${brand.name}"品牌生成一篇SEO优化的文章。

品牌信息：
- 品牌名称：${brand.name}
- 品牌网站：${brand.website || '未知'}

文章要求：
- 标题：${title || '未指定'}
- 主题：${topic || '品牌介绍'}
- 风格：${style || '专业'}
- 长度：${length || '中等'}

请生成一篇结构清晰、SEO友好的文章，包含吸引人的标题、介绍部分、主体内容（至少3个段落）和总结部分。`;

  try {
    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        agent: agentId || '',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的SEO内容撰写专家。'
          },
          {
            role: 'user',
            content: articleRequest
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: { message: `文章生成API调用失败: ${response.status} - ${errorText}` } };
    }

    const responseData = await response.json();
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      return { error: { message: '大模型返回内容为空' } };
    }

    return {
      article: content,
      title: title || '未命名文章',
      brand: brand.name,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    return { error: { message: '文章生成失败', details: error.message } };
  }
}

/**
 * AI对话
 * @param {string} question - 用户问题
 * @param {Object} [context] - 上下文信息
 * @param {string} [customAgentId] - 自定义Agent ID
 * @returns {Promise<Object>} 对话结果
 */
async function aiChat(question, context = {}, customAgentId = '') {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = customAgentId || process.env.LLM_AGENT || '';

  console.log('=== 开始AI对话 ===');
  console.log(`问题: ${question}`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    return { error: { message: '大模型API配置未完成' } };
  }

  const contextInfo = Object.keys(context).length > 0
    ? `\n上下文信息：\n${Object.entries(context).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    : '';

  const chatRequest = `${question}${contextInfo}`;

  try {
    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        agent: agentId || '',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的AI助手。'
          },
          {
            role: 'user',
            content: chatRequest
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: { message: `AI对话API调用失败: ${response.status} - ${errorText}` } };
    }

    const responseData = await response.json();
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      return { error: { message: '大模型返回内容为空' } };
    }

    return {
      answer: content,
      question: question,
      context: context,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    return { error: { message: 'AI对话失败', details: error.message } };
  }
}

/**
 * 获取默认的品牌分析数据结构
 * @param {string} brandName - 品牌名称
 * @param {string} [website] - 品牌网站
 * @returns {Object} 默认的空数据结构
 */
function getDefaultAnalysisData(brandName, website = '') {
  return {
    brandName: brandName || '',
    officialWebsite: website || '',
    updateTime: new Date().toISOString(),
    overview: {
      aiPlatformCount: 0,
      queryCount: 0,
      brandMentionRate: 0,
      positiveSentimentRate: 0,
      officialCitationRate: 0,
      dataSourceNote: '数据采集进行中，暂未获取到数据',
      overallScore: 0,
      confidence: 0,
      summary: '暂无分析数据',
      industry: '未知',
      brandName: brandName || ''
    },
    aiVisibility: [
      {platform: '豆包', mentionCount: 0, totalQueries: 0, mentionRate: 0, remark: '暂无数据'},
      {platform: '千问', mentionCount: 0, totalQueries: 0, mentionRate: 0, remark: '暂无数据'},
      {platform: '文心一言', mentionCount: 0, totalQueries: 0, mentionRate: 0, remark: '暂无数据'},
      {platform: '讯飞星火', mentionCount: 0, totalQueries: 0, mentionRate: 0, remark: '暂无数据'},
      {platform: 'ChatGPT', mentionCount: 0, totalQueries: 0, mentionRate: 0, remark: '暂无数据'},
      {platform: 'Gemini', mentionCount: 0, totalQueries: 0, mentionRate: 0, remark: '暂无数据'}
    ],
    visibility: {
      overallVisibility: 0,
      mentionCount: 0,
      weeklyChange: '0%',
      industryRank: '-',
      platforms: []
    },
    perception: {
      positive: 0,
      neutral: 0,
      negative: 0
    },
    visibilityNote: '基于搜索引擎实时结果分析',
    visibilityCoreFinding: '分析进行中，暂无核心发现',
    officialPositioning: {
      source: website || '',
      mission: '暂无数据',
      coreBusiness: '暂无数据',
      userScale: '暂无数据',
      brandUpgrade: '暂无数据'
    },
    keywords: [{keyword: '暂无数据', frequency: 0}],
    perceptionDifferences: ['暂无数据'],
    searchAssociations: [
      {type: '品牌+服务', example: '暂无数据'},
      {type: '品牌+竞争', example: '暂无数据'},
      {type: '品牌+问题', example: '暂无数据'},
      {type: '品牌+AI', example: '暂无数据'}
    ],
    brandHomeShare: 0,
    serviceHomeShare: 0,
    competitionHomeShare: 0,
    sentimentDistribution: {
      positive: 0,
      neutral: 0,
      negative: 0,
      positiveChange: '0%',
      neutralChange: '0%',
      negativeChange: '0%'
    },
    typicalKeywords: {},
    positiveExample: '暂无数据',
    positiveSources: [],
    negativeExample: '暂无数据',
    negativeSources: [],
    topics: [{name: '暂无数据', count: 0, trend: '稳定'}],
    citations: [{source: '暂无数据', count: 0}],
    citationSources: [{type: '官网引用', percentage: 0, representative: '暂无数据'}],
    citationHabits: {},
    prompts: [],
    answerSnapshot: {question: '暂无数据', source: '暂无数据', excerpt: '暂无数据'},
    competitors: [],
    suggestions: [{priority: 'P2', title: '暂无建议', description: '暂无建议内容'}]
  };
}

/**
 * 确保解析后的数据包含所有必要字段
 * @param {Object} data - 解析后的数据
 * @returns {Object} 包含所有必要字段的数据
 */
function ensureRequiredFields(data) {
  const defaults = {
    brandName: '',
    officialWebsite: '',
    updateTime: new Date().toISOString(),
    overview: {
      aiPlatformCount: 0,
      queryCount: 0,
      brandMentionRate: 0,
      positiveSentimentRate: 0,
      officialCitationRate: 0,
      dataSourceNote: '暂无数据',
      // 前端期望的字段
      overallScore: 0,
      confidence: 0,
      summary: '暂无分析数据',
      industry: '未知',
      brandName: ''  // 前端期望的品牌名称字段
    },
    aiVisibility: [],
    visibilityNote: '',
    visibilityCoreFinding: '',
    // 前端期望的visibility结构
    visibility: {
      overallVisibility: 0,
      mentionCount: 0,
      weeklyChange: '0%',
      industryRank: '-',
      platforms: []
    },
    // 前端期望的perception结构
    perception: {
      positive: 0,
      neutral: 0,
      negative: 0
    },
    officialPositioning: {
      source: '',
      mission: '暂无数据',
      coreBusiness: '暂无数据',
      userScale: '暂无数据',
      brandUpgrade: '暂无数据'
    },
    keywords: [],
    perceptionDifferences: [],
    searchAssociations: [],
    brandHomeShare: 0,
    serviceHomeShare: 0,
    competitionHomeShare: 0,
    sentimentDistribution: {
      positive: 0,
      neutral: 0,
      negative: 0,
      positiveChange: '0%',
      neutralChange: '0%',
      negativeChange: '0%'
    },
    typicalKeywords: {},
    positiveExample: '',
    positiveSources: [],
    negativeExample: '',
    negativeSources: [],
    // 前端期望的topics结构
    topics: [],
    // 前端期望的citations结构
    citations: [],
    citationSources: [],
    citationHabits: {},
    prompts: [],
    answerSnapshot: {
      question: '',
      source: '',
      excerpt: ''
    },
    competitors: [],
    // 前端期望的suggestions结构
    suggestions: []
  };

  const merged = Object.assign({}, defaults, data, {
    overview: Object.assign({}, defaults.overview, data.overview),
    visibility: Object.assign({}, defaults.visibility, data.visibility),
    perception: Object.assign({}, defaults.perception, data.perception),
    officialPositioning: Object.assign({}, defaults.officialPositioning, data.officialPositioning),
    sentimentDistribution: Object.assign({}, defaults.sentimentDistribution, data.sentimentDistribution),
    answerSnapshot: Object.assign({}, defaults.answerSnapshot, data.answerSnapshot)
  });

  // 计算前端需要的visibility数据
  if (merged.aiVisibility && merged.aiVisibility.length > 0) {
    const rates = merged.aiVisibility.filter(v => v.mentionRate > 0).map(v => v.mentionRate);
    merged.visibility.overallVisibility = rates.length > 0 
      ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) 
      : 0;
    
    const mentionCounts = merged.aiVisibility.filter(v => v.mentionCount > 0).map(v => v.mentionCount);
    merged.visibility.mentionCount = mentionCounts.reduce((a, b) => a + b, 0);
    
    merged.visibility.platforms = merged.aiVisibility.map(v => ({
      name: v.platform,
      visibility: v.mentionRate || 0
    }));
  }

  // 同步perception数据从sentimentDistribution
  if (merged.sentimentDistribution) {
    merged.perception.positive = merged.sentimentDistribution.positive || 0;
    merged.perception.neutral = merged.sentimentDistribution.neutral || 0;
    merged.perception.negative = merged.sentimentDistribution.negative || 0;
  }

  // 计算综合评分
  if (merged.overview) {
    const { brandMentionRate, positiveSentimentRate, officialCitationRate } = merged.overview;
    merged.overview.overallScore = Math.round((brandMentionRate + positiveSentimentRate + officialCitationRate) / 3);
    merged.overview.confidence = merged.overview.queryCount > 0 ? 0.8 : 0.5;
  }

  // 生成topics和citations结构
  if (!merged.topics || merged.topics.length === 0) {
    merged.topics = [];
  } else {
    merged.topics = merged.topics.map(t => ({
      name: t.topic || t.name,
      count: t.coOccurrenceRate || t.count || 0,
      trend: '稳定'
    }));
  }

  if (!merged.citations || merged.citations.length === 0) {
    merged.citations = [];
  } else {
    merged.citations = merged.citations.map(c => ({
      source: c.type || c.source,
      count: c.percentage || c.count || 0
    }));
  }

  // 生成suggestions结构
  if (!merged.suggestions || merged.suggestions.length === 0) {
    merged.suggestions = [];
  } else {
    merged.suggestions = merged.suggestions.map(s => ({
      priority: s.priority || 'P2',
      title: s.action || s.title,
      description: s.expectedEffect || s.description
    }));
  }

  // 确保overview.brandName与顶层brandName一致
  if (merged.brandName && !merged.overview.brandName) {
    merged.overview.brandName = merged.brandName;
  }

  return merged;
}

/**
 * 预设提示词模板列表
 * @type {Array<Object>}
 */
const PRESET_PROMPT_TEMPLATES = [
  { id: 'brand_intro', type: '品牌认知', template: '什么是{{brand}}？', description: '品牌定义和介绍' },
  { id: 'brand_history', type: '品牌认知', template: '{{brand}}的发展历程是怎样的？', description: '品牌历史和发展' },
  { id: 'brand_values', type: '品牌认知', template: '{{brand}}的核心价值观是什么？', description: '品牌价值观' },
  { id: 'product_review', type: '产品评价', template: '{{brand}}的产品怎么样？', description: '产品质量评价' },
  { id: 'product_features', type: '产品评价', template: '{{brand}}的主要产品有哪些特点？', description: '产品特性分析' },
  { id: 'user_experience', type: '产品评价', template: '用户对{{brand}}的评价如何？', description: '用户体验' },
  { id: 'competitor_compare', type: '竞品对比', template: '{{brand}}和主要竞争对手相比有什么优势？', description: '竞争优势分析' },
  { id: 'market_position', type: '竞品对比', template: '{{brand}}在市场中的定位是什么？', description: '市场定位' },
  { id: 'usage_guide', type: '使用方法', template: '如何使用{{brand}}的产品？', description: '使用指南' },
  { id: 'tips', type: '使用方法', template: '{{brand}}的使用技巧有哪些？', description: '使用技巧' },
  { id: 'latest_news', type: '最新动态', template: '{{brand}}最近有什么新动态？', description: '最新消息' },
  { id: 'future_plans', type: '最新动态', template: '{{brand}}未来的发展规划是什么？', description: '未来规划' },
  { id: 'pricing', type: '价格相关', template: '{{brand}}的产品价格怎么样？', description: '价格分析' },
  { id: 'promotions', type: '价格相关', template: '{{brand}}有什么优惠活动？', description: '优惠信息' },
  { id: 'official_site', type: '官方信息', template: '{{brand}}的官方网站是什么？', description: '官网地址' },
  { id: 'contact_info', type: '官方信息', template: '如何联系{{brand}}的客服？', description: '联系方式' },
  { id: 'reputation', type: '口碑评价', template: '{{brand}}的口碑怎么样？', description: '品牌口碑' },
  { id: 'trustworthiness', type: '口碑评价', template: '{{brand}}值得信赖吗？', description: '品牌可信度' }
];

/**
 * 生成品牌相关的提示词问题
 * @param {string} brandName - 品牌名称
 * @param {number} [count] - 生成数量，默认10个
 * @param {boolean} [useAI] - 是否调用AI生成，默认false使用预设模板
 * @returns {Promise<Array<Object>>} 提示词列表
 */
async function generateBrandPrompts(brandName, count = 10, useAI = false) {
  console.log(`生成品牌提示词: ${brandName}, 数量: ${count}, 使用AI: ${useAI}`);

  if (useAI) {
    return await generatePromptsWithAI(brandName, count);
  } else {
    return generatePromptsFromTemplates(brandName, count);
  }
}

/**
 * 从预设模板生成提示词
 * @param {string} brandName - 品牌名称
 * @param {number} count - 生成数量
 * @returns {Array<Object>} 提示词列表
 */
function generatePromptsFromTemplates(brandName, count) {
  // 随机选择模板并替换品牌名
  const shuffled = [...PRESET_PROMPT_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map((template, index) => ({
    id: `prompt_${Date.now()}_${index}`,
    type: template.type,
    question: template.template.replace(/\{\{brand\}\}/g, brandName),
    description: template.description,
    status: 'pending' // pending: 待回答, completed: 已回答
  }));
}

/**
 * 使用AI生成提示词（框架代码，暂未实现）
 * @param {string} brandName - 品牌名称
 * @param {number} count - 生成数量
 * @returns {Promise<Array<Object>>} 提示词列表
 */
async function generatePromptsWithAI(brandName, count) {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = process.env.LLM_AGENT || '';

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    console.warn('AI配置未完成，使用预设模板生成提示词');
    return generatePromptsFromTemplates(brandName, count);
  }

  try {
    const promptRequest = `请为品牌"${brandName}"生成${count}个常见的用户问题，涵盖以下类型：
1. 品牌认知类
2. 产品评价类
3. 竞品对比类
4. 使用方法类
5. 最新动态类
6. 价格相关类
7. 官方信息类
8. 口碑评价类

请以JSON格式返回，每个问题包含id、type（类型）、question（问题）、description（描述）。`;

    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        agent: agentId || '',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的SEO专家，擅长生成用户搜索意图相关的问题。'
          },
          {
            role: 'user',
            content: promptRequest
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      console.warn('AI生成提示词失败，使用预设模板');
      return generatePromptsFromTemplates(brandName, count);
    }

    const responseData = await response.json();
    const content = responseData.choices?.[0]?.message?.content;

    try {
      const result = JSON.parse(content);
      return Array.isArray(result) ? result : generatePromptsFromTemplates(brandName, count);
    } catch {
      return generatePromptsFromTemplates(brandName, count);
    }
  } catch (error) {
    console.warn('AI生成提示词失败:', error.message);
    return generatePromptsFromTemplates(brandName, count);
  }
}

/**
 * 单独调用智能体获取单个提示词的答案
 * @param {string} question - 问题
 * @param {Object} context - 上下文信息（包含品牌信息等）
 * @param {string} [customAgentId] - 自定义Agent ID
 * @returns {Promise<Object>} 答案结果
 */
async function getPromptAnswer(question, context = {}, customAgentId = '') {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = customAgentId || process.env.LLM_AGENT || '';

  console.log(`获取提示词答案: "${question}"`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    return {
      error: { message: '大模型API配置未完成' }
    };
  }

  const brandName = context.brandName || '该品牌';
  const brandWebsite = context.website || '';

  const answerRequest = `请详细回答以下关于"${brandName}"品牌的问题：

问题：${question}

品牌信息（如需要）：
- 品牌名称：${brandName}
- 官方网站：${brandWebsite || '未知'}

请提供详细、准确的回答。`;

  try {
    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        agent: agentId || '',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的品牌信息专家，能够准确回答关于各种品牌的问题。'
          },
          {
            role: 'user',
            content: answerRequest
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: { message: `获取答案失败: ${response.status} - ${errorText}` }
      };
    }

    const responseData = await response.json();
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      return {
        error: { message: '大模型返回内容为空' }
      };
    }

    return {
      question: question,
      answer: content,
      brandName: brandName,
      context: context,
      answeredAt: new Date().toISOString(),
      status: 'completed'
    };
  } catch (error) {
    return {
      error: { message: '获取答案失败', details: error.message }
    };
  }
}

/**
 * 批量获取提示词答案
 * @param {Array<Object>} prompts - 提示词列表
 * @param {Object} context - 上下文信息
 * @param {string} [customAgentId] - 自定义Agent ID
 * @returns {Promise<Array<Object>>} 答案列表
 */
async function getBatchPromptAnswers(prompts, context = {}, customAgentId = '') {
  console.log(`批量获取${prompts.length}个提示词答案`);

  // 过滤未回答的提示词
  const pendingPrompts = prompts.filter(p => p.status === 'pending' || !p.status);
  
  const results = [];
  for (const prompt of pendingPrompts) {
    const result = await getPromptAnswer(prompt.question, context, customAgentId);
    results.push({
      ...prompt,
      ...result,
      status: result.error ? 'failed' : 'completed'
    });
    
    // 添加延迟，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

module.exports = {
  performAIAnalysis,
  performPromptAnalysis,
  generateArticle,
  aiChat,
  // 新增提示词相关函数
  generateBrandPrompts,
  getPromptAnswer,
  getBatchPromptAnswers,
  // 暴露预设模板供外部使用
  PRESET_PROMPT_TEMPLATES
};
