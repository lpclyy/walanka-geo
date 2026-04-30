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
  console.log('注意：品牌分析仅使用品牌名称，不传递网址信息');

  // 使用用户提供的geo模板格式调用智能体，返回JSON格式
  try {
    // 极简提示词：只传递品牌名称和JSON格式要求
    const analysisPrompt = `${brand.name} 请返回JSON格式的数据`;

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
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0,
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
      
      // 打印智能体返回的原始内容
      console.log('----------------------------------------');
      console.log('[智能体原始返回内容]');
      console.log('----------------------------------------');
      if (content.length > 5000) {
        console.log(`[内容过长，显示前5000字符]`);
        console.log(content.substring(0, 5000) + '...(剩余 ' + (content.length - 5000) + ' 字符)');
      } else {
        console.log(content);
      }
      console.log('----------------------------------------');

      // 从文本中提取JSON部分
      const extractJSON = (text) => {
        const firstBrace = text.indexOf('{');
        if (firstBrace === -1) {
          return null;
        }
        
        let depth = 0;
        let endIndex = -1;
        
        for (let i = firstBrace; i < text.length; i++) {
          if (text[i] === '{') {
            depth++;
          } else if (text[i] === '}') {
            depth--;
            if (depth === 0) {
              endIndex = i;
              break;
            }
          } else if (text[i] === '"') {
            // 跳过字符串内容
            i++;
            while (i < text.length && (text[i] !== '"' || text[i-1] === '\\')) {
              i++;
            }
          }
        }
        
        if (endIndex !== -1 && firstBrace < endIndex) {
          return text.substring(firstBrace, endIndex + 1);
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

      // 如果解析失败，返回错误
      if (!parsedData) {
        const errorMsg = parseError || '智能体返回的数据无效';
        console.error(`[错误] 解析失败: ${errorMsg}`);
        console.log('========================================');
        return {
          error: {
            module: 'aiService.performAIAnalysis',
            function: 'JSON.parse',
            message: '解析智能体返回数据失败',
            details: errorMsg
          }
        };
      }

      // 验证品牌名称
      if (!parsedData.brandName) {
        parsedData.brandName = brand.name;
      }
      
      // 打印智能体原始返回数据结构（用于调试）
      console.log('----------------------------------------');
      console.log('[智能体原始返回数据结构]');
      console.log(`原始字段列表: ${Object.keys(parsedData).join(', ')}`);
      console.log('----------------------------------------');
      
      // 字段映射转换：将智能体返回的下划线格式转换为代码期望的格式
      parsedData = transformAgentData(parsedData);
      
      // 打印转换后的数据结构
      console.log('----------------------------------------');
      console.log('[字段转换后数据结构]');
      console.log(`转换后字段列表: ${Object.keys(parsedData).join(', ')}`);
      console.log(`官方定位: ${JSON.stringify(parsedData.officialPositioning)}`);
      console.log(`关键词数量: ${parsedData.keywords?.length || 0}`);
      console.log(`话题数量: ${parsedData.topics?.length || 0}`);
      console.log('----------------------------------------');
      
      // 确保所有必要字段存在
      parsedData = ensureRequiredFields(parsedData);

      // 打印最终解析结果摘要
      console.log('----------------------------------------');
      console.log('[最终解析结果摘要]');
      console.log(`解析成功: ${parseSuccess}`);
      console.log(`品牌名称: ${parsedData.brandName}`);
      console.log(`概览数据: ${JSON.stringify(parsedData.overview)}`);
      console.log(`AI可见度平台数: ${parsedData.aiVisibility?.length || 0}`);
      console.log(`热门主题数: ${parsedData.topics?.length || 0}`);
      console.log(`建议数: ${parsedData.suggestions?.length || 0}`);
      console.log(`官方定位: ${JSON.stringify(parsedData.officialPositioning)}`);
      console.log(`关键词数量: ${parsedData.keywords?.length || 0}`);
      console.log('----------------------------------------');

      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);

      console.log('========================================');
      console.log(`[分析完成] ${endTime.toLocaleString()}`);
      console.log(`耗时: ${duration} 秒`);
      console.log(`品牌名称: ${parsedData.brandName}`);
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
 * 获取默认的品牌分析数据结构（空数据）
 * @param {string} brandName - 品牌名称
 * @returns {Object} 空数据结构
 */
function getDefaultAnalysisData(brandName) {
  return {
    brandName: brandName || '',
    officialWebsite: '',
    updateTime: new Date().toISOString(),
    overview: {
      aiPlatformCount: 0,
      queryCount: 0,
      brandMentionRate: 0,
      positiveSentimentRate: 0,
      officialCitationRate: 0,
      dataSourceNote: '',
      overallScore: 0,
      confidence: 0,
      summary: '',
      industry: '',
      brandName: brandName || ''
    },
    aiVisibility: [],
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
    visibilityNote: '',
    visibilityCoreFinding: '',
    officialPositioning: {
      source: '',
      mission: '',
      coreBusiness: '',
      userScale: '',
      brandUpgrade: ''
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
    topics: [],
    citations: [],
    citationSources: [],
    citationHabits: {},
    prompts: [],
    answerSnapshot: {question: '', source: '', excerpt: ''},
    competitors: [],
    suggestions: []
  };
}

/**
 * 字段映射转换：将智能体返回的下划线格式字段转换为代码期望的格式
 * @param {Object} agentData - 智能体返回的原始数据
 * @returns {Object} 转换后的数据
 */
function transformAgentData(agentData) {
  if (!agentData || typeof agentData !== 'object') {
    return agentData;
  }

  const transformed = { ...agentData };

  // 处理官方定位字段映射
  if (agentData.source || agentData.mission || agentData.core_business || 
      agentData.user_scale || agentData.brand_upgrade) {
    transformed.officialPositioning = transformed.officialPositioning || {};
    transformed.officialPositioning.source = agentData.source || transformed.officialPositioning.source;
    transformed.officialPositioning.mission = agentData.mission || transformed.officialPositioning.mission;
    transformed.officialPositioning.coreBusiness = agentData.core_business || transformed.officialPositioning.coreBusiness;
    transformed.officialPositioning.userScale = agentData.user_scale || transformed.officialPositioning.userScale;
    transformed.officialPositioning.brandUpgrade = agentData.brand_upgrade || transformed.officialPositioning.brandUpgrade;
  }

  // 处理关键词字段映射
  if (agentData.ai_keywords && Array.isArray(agentData.ai_keywords)) {
    transformed.keywords = agentData.ai_keywords.map(item => ({
      keyword: item.keyword || item.name || '',
      frequency: item.count || item.frequency || 0
    }));
  }

  // 处理感知差异字段映射
  if (agentData.ai_vs_traditional_diffs && Array.isArray(agentData.ai_vs_traditional_diffs)) {
    transformed.perceptionDifferences = agentData.ai_vs_traditional_diffs;
  }

  // 处理搜索关联字段映射（支持数组和对象两种格式）
  if (agentData.search_associations) {
    if (Array.isArray(agentData.search_associations)) {
      transformed.searchAssociations = agentData.search_associations.map(item => ({
        type: item.type || '',
        example: item.example || ''
      }));
    } else if (typeof agentData.search_associations === 'object') {
      // 如果是对象格式，转换为数组
      transformed.searchAssociations = Object.entries(agentData.search_associations).map(([key, value]) => ({
        type: key.replace(/_/g, ' '),
        example: value || ''
      }));
    }
  }

  // 处理情感分布字段映射
  if (agentData.sentiment_distribution) {
    transformed.sentimentDistribution = {
      positive: agentData.sentiment_distribution.positive || 0,
      neutral: agentData.sentiment_distribution.neutral || 0,
      negative: agentData.sentiment_distribution.negative || 0,
      positiveChange: agentData.sentiment_distribution.positive_change || '0%',
      neutralChange: agentData.sentiment_distribution.neutral_change || '0%',
      negativeChange: agentData.sentiment_distribution.negative_change || '0%'
    };
  }

  // 处理热门话题字段映射
  if (agentData.hot_topics && Array.isArray(agentData.hot_topics)) {
    transformed.topics = agentData.hot_topics.map(item => ({
      name: item.topic || item.name || '',
      count: item.count || item.co_occurrence_rate || 0,
      trend: '稳定'
    }));
  }

  // 处理AI可见度字段映射
  if (agentData.ai_visibility && Array.isArray(agentData.ai_visibility)) {
    transformed.aiVisibility = agentData.ai_visibility.map(item => ({
      platform: item.platform || '',
      mentionCount: item.mention_count || 0,
      totalQueries: item.total_queries || 0,
      mentionRate: item.mention_rate || 0,
      remark: item.remark || ''
    }));
  }

  // 处理引用来源字段映射
  if (agentData.citation_sources && Array.isArray(agentData.citation_sources)) {
    transformed.citationSources = agentData.citation_sources.map(item => ({
      type: item.type || '',
      percentage: item.percentage || 0,
      representative: item.representative || ''
    }));
  }

  // 处理概览数据字段映射（直接在顶层的字段）
  if (agentData.avg_mention_rate !== undefined) {
    transformed.overview = transformed.overview || {};
    transformed.overview.brandMentionRate = agentData.avg_mention_rate;
  }
  if (agentData.avg_positive_rate !== undefined) {
    transformed.overview = transformed.overview || {};
    transformed.overview.positiveSentimentRate = agentData.avg_positive_rate;
  }
  if (agentData.avg_citation_rate !== undefined) {
    transformed.overview = transformed.overview || {};
    transformed.overview.officialCitationRate = agentData.avg_citation_rate;
  }
  
  // 处理概览数据字段映射（嵌套的overview对象）
  if (agentData.overview) {
    const overview = agentData.overview;
    transformed.overview = transformed.overview || {};
    transformed.overview.aiPlatformCount = overview.ai_platform_count || overview.aiPlatformCount || transformed.overview.aiPlatformCount;
    transformed.overview.queryCount = overview.query_count || overview.queryCount || transformed.overview.queryCount;
    transformed.overview.brandMentionRate = overview.brand_mention_rate || overview.brandMentionRate || transformed.overview.brandMentionRate;
    transformed.overview.positiveSentimentRate = overview.positive_sentiment_rate || overview.positiveSentimentRate || transformed.overview.positiveSentimentRate;
    transformed.overview.officialCitationRate = overview.official_citation_rate || overview.officialCitationRate || transformed.overview.officialCitationRate;
    transformed.overview.dataSourceNote = overview.data_source_note || overview.dataSourceNote || transformed.overview.dataSourceNote;
    transformed.overview.overallScore = overview.overall_score || overview.overallScore || transformed.overview.overallScore;
    transformed.overview.confidence = overview.confidence || transformed.overview.confidence;
    transformed.overview.summary = overview.summary || transformed.overview.summary;
    transformed.overview.industry = overview.industry || transformed.overview.industry;
  }

  // 处理品牌名称字段映射
  if (agentData.brand_name) {
    transformed.brandName = agentData.brand_name;
  }

  // 处理网站字段映射
  if (agentData.website) {
    transformed.officialWebsite = agentData.website;
  }

  // 处理更新时间字段映射
  if (agentData.update_time) {
    transformed.updateTime = agentData.update_time;
  }

  // 处理首页份额字段映射
  if (agentData.homepage_share && typeof agentData.homepage_share === 'object') {
    const share = agentData.homepage_share;
    if (share.brand_word !== undefined) {
      transformed.brandHomeShare = share.brand_word;
    }
    if (share.brand_service !== undefined) {
      transformed.serviceHomeShare = share.brand_service;
    }
    if (share.brand_competition !== undefined) {
      transformed.competitionHomeShare = share.brand_competition;
    }
  }

  // 处理平台可见度字段映射
  if (agentData.platforms && Array.isArray(agentData.platforms)) {
    transformed.aiVisibility = agentData.platforms.map(item => ({
      platform: item.name || '',
      mentionRate: item.mention_rate || 0,
      mentionCount: item.mention_count || 0,
      totalQueries: 0,
      remark: ''
    }));
  }

  console.log('[字段转换] 已完成智能体数据字段映射转换');
  
  return transformed;
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
      dataSourceNote: '',
      overallScore: 0,
      confidence: 0,
      summary: '',
      industry: '',
      brandName: ''
    },
    aiVisibility: [],
    visibilityNote: '',
    visibilityCoreFinding: '',
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
    officialPositioning: {
      source: '',
      mission: '',
      coreBusiness: '',
      userScale: '',
      brandUpgrade: ''
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
    topics: [],
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
/**
 * 生成品牌提示词
 * @param {Object|string} brand - 品牌信息对象或品牌名称
 * @param {number} [count=10] - 生成数量
 * @param {boolean} [useAI=false] - 是否使用AI生成
 * @returns {Promise<Array<Object>>} 提示词列表
 */
async function generateBrandPrompts(brand, count = 10, useAI = true) {
  // 支持传入品牌对象或品牌名称字符串
  const brandName = typeof brand === 'object' ? brand.name : brand;
  const website = typeof brand === 'object' ? brand.website : '';
  
  console.log(`生成品牌提示词: ${brandName}, 网址: ${website || '未提供'}, 数量: ${count}, 使用AI: ${useAI}`);

  if (useAI) {
    return await generatePromptsWithAI(brandName, website, count);
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
 * 使用AI生成提示词
 * @param {string} brandName - 品牌名称
 * @param {string} [website] - 品牌网站（可选）
 * @param {number} count - 生成数量
 * @returns {Promise<Array<Object>>} 提示词列表
 */
async function generatePromptsWithAI(brandName, website = '', count) {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = process.env.LLM_AGENT || '';

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    console.warn('AI配置未完成，使用预设模板生成提示词');
    return generatePromptsFromTemplates(brandName, count);
  }

  try {
    const websiteInfo = website ? `品牌官网：${website}\n` : '';
    
    const promptRequest = `请分析品牌"${brandName}"并生成${count}个常见的用户问题。

品牌信息：
品牌名称：${brandName}
${websiteInfo}

请先搜索了解该品牌的核心业务、产品分类、市场定位等基础信息，然后基于这些信息生成涵盖以下类型的用户问题：
1. 品牌认知类 - 用户对品牌的基本了解和认知相关问题
2. 产品评价类 - 用户对产品的评价和使用体验相关问题
3. 竞品对比类 - 用户比较该品牌与竞争对手的问题
4. 使用方法类 - 用户询问产品使用方法和技巧的问题
5. 最新动态类 - 用户关注品牌最新动态和新闻的问题
6. 价格相关类 - 用户关注产品价格和优惠的问题
7. 官方信息类 - 用户查询官方渠道和联系方式的问题
8. 口碑评价类 - 用户了解品牌口碑和信誉的问题

请以纯JSON格式返回，每个问题包含：
- id: 唯一标识
- type: 问题类型（上述8类之一）
- question: 用户问题
- description: 问题描述或用途说明

返回格式示例：
[{"id":"prompt_1","type":"品牌认知类","question":"${brandName}是什么品牌？","description":"用户想了解品牌基本信息"},...]

请确保返回纯JSON，不包含其他任何文本！`;

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
