/**
 * AI服务模块
 * @module services/aiService
 * @description 提供品牌分析、提示词分析、文章生成等AI相关功能
 * 调用用户的OpenClaw智能体获取数据，智能体以模板格式返回
 */

require('dotenv').config();
const brandModel = require('../models/brand');
const { parseGEOReport, validateReport } = require('../utils/geoParser');

/**
 * 调用OpenClaw智能体进行品牌分析
 * @param {number} brandId - 品牌ID
 * @param {Object} brandInfo - 品牌信息
 * @param {string} [customAgentId] - 自定义Agent ID
 * @returns {Promise<Object>} 分析结果
 */
async function performAIAnalysis(brandId, brandInfo, customAgentId = '') {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = customAgentId || process.env.LLM_AGENT;

  console.log('=== 开始品牌分析流程 ===');
  console.log(`品牌ID: ${brandId}`);
  console.log(`品牌信息: ${JSON.stringify(brandInfo)}`);
  console.log(`Agent ID: ${agentId}`);
  console.log(`大模型API配置: URL=${llmApiUrl}, Model=${llmModel}`);

  // 验证API配置
  if (!llmApiKey || !llmApiUrl || !llmModel) {
    const error = '大模型API配置未完成，请检查.env文件中的LLM_API_KEY、LLM_API_URL和LLM_MODEL配置';
    console.error('错误:', error);
    return {
      error: {
        module: 'aiService.performAIAnalysis',
        function: 'performAIAnalysis',
        message: error,
        details: 'API配置缺失'
      }
    };
  }

  // 验证品牌信息
  let brand;
  if (brandInfo && brandInfo.name) {
    brand = brandInfo;
  } else {
    try {
      brand = await brandModel.getBrandById(brandId);
      if (!brand) {
        const error = `品牌 ${brandId} 不存在`;
        console.error('错误:', error);
        return {
          error: {
            module: 'aiService.performAIAnalysis',
            function: 'getBrandById',
            message: error,
            details: '品牌不存在'
          }
        };
      }
    } catch (error) {
      console.error('获取品牌信息失败:', error);
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
    console.error('错误:', error);
    return {
      error: {
        module: 'aiService.performAIAnalysis',
        function: 'validateBrand',
        message: error,
        details: 'brand.name 为空'
      }
    };
  }

  console.log(`开始分析品牌: ${brand.name}`);

  // 使用用户提供的geo模板格式调用智能体
  try {
    // 构建符合用户模板格式的提示词
    const analysisPrompt = `请使用您的GEO智能体分析"${brand.name}"品牌，并按照以下指定模板格式返回结果：

# {{${brand.name}}} GEO 品牌分析报告
数据更新时间：{{YYYY-MM-DD HH:MM:SS}}（GMT+8）
品牌名称：{{${brand.name}}}
官方网站：{{${brand.website || '未知'}}}

## 板块 1：数据总览
| 指标 | 数值 |
|------|------|
| 数据更新时间 | {{YYYY-MM-DD HH:MM:SS}} |
| 覆盖 AI 平台数 | {{N}} |
| 执行查询总数 | {{M}} |
| 平均品牌提及率 | {{X}}% |
| 平均正面情感占比 | {{Y}}% |
| 官网引用率 | {{Z}}% |
| 数据来源说明 | {{基于搜索引擎实时结果，受限于各AI平台无公开搜索API，本报告通过全网搜索间接统计，估算误差±8%}} |

## 板块 2：品牌 AI 可见度
⚠️ **说明**：{{说明间接统计的方式}}

| AI 平台 | 提及次数 | 提及率 | 备注 |
|---------|----------|--------|------|
| 豆包 | {{X}}/{{M}} | {{X}}% | {{备注}} |
| 千问 | {{X}}/{{M}} | {{X}}% | {{备注}} |
| DeepSeek | {{X}}/{{M}} | {{X}}% | {{备注}} |
| 腾讯元宝 | {{X}}/{{M}} | {{X}}% | {{备注}} |
| Kimi | {{X}}/{{M}} | {{X}}% | {{备注}} |
| 文心一言 | {{X}}/{{M}} | {{X}}% | {{备注}} |
| 智谱 GLM | {{X}}/{{M}} | {{X}}% | {{备注}} |
| 夸克 AI | {{X}}/{{M}} | {{X}}% | {{备注}} |
| 讯飞星火 | {{X}}/{{M}} | {{X}}% | {{备注}} |
| 混元 | {{X}}/{{M}} | {{X}}% | {{备注}} |
| 秘塔 AI | {{X}}/{{M}} | {{X}}% | {{备注}} |
| 即梦 AI | {{X}}/{{M}} | {{X}}% | {{备注}} |
| ChatGPT | {{X}}/{{M}} | {{X}}% | {{备注}} |
| Gemini | {{X}}/{{M}} | {{X}}% | {{备注}} |
| Claude | {{X}}/{{M}} | {{X}}% | {{备注}} |

**核心发现**：{{一句话总结品牌可见度核心发现}}

## 板块 3：品牌概览
### 3.1 官方自我定位
来源：{{${brand.website || '官网域名'}}}
- 企业使命：{{企业使命描述}}
- 核心业务：{{核心业务描述}}
- 用户规模：{{用户规模描述}}
- 品牌升级：{{品牌升级描述}}

### 3.2 AI 平台视角下的品牌
| 高频关键词 | 出现频次 |
|------------|----------|
| {{关键词1}} | {{N}}次 |
| {{关键词2}} | {{N}}次 |
| {{关键词3}} | {{N}}次 |
| {{关键词4}} | {{N}}次 |
| {{关键词5}} | {{N}}次 |

### 3.3 AI 与传统品牌认知差异
1. {{差异点1}}
2. {{差异点2}}
3. {{差异点3}}

## 板块 4：品牌可见度
### 4.1 搜索联想词
| 联想词类型 | 示例 |
|------------|------|
| 品牌+服务 | {{...}} |
| 品牌+竞争 | {{...}} |
| 品牌+问题 | {{...}} |
| 品牌+AI | {{...}} |

### 4.2 搜索首页占有率
- 品牌词"{{${brand.name}}}"首页占有率：{{X}}%
- "{{${brand.name}}+服务"相关词：{{X}}%
- "{{${brand.name}}+竞争"类词：{{X}}%

## 板块 5：品牌感知（情感/立场分析）
### 5.1 整体情感分布
| 情感类型 | 占比 | 较上一季度变化 |
|----------|------|----------------|
| 正面 | {{X}}% | {{±X}}% |
| 中立/混合 | {{Y}}% | {{±Y}}% |
| 负面 | {{Z}}% | {{±Z}}% |

### 5.2 各平台典型关键词
| 平台类型 | 正面关键词 | 负面关键词 |
|----------|------------|------------|
| 官方/权威媒体 | {{...}} | {{...}} |
| 行业分析 | {{...}} | {{...}} |
| 社交/用户 | {{...}} | {{...}} |
| AI平台分析 | {{...}} | {{...}} |

### 5.3 典型正面与负面评价
**正面代表**（来源：{{来源1}}, {{来源2}}）：
> {{引用正面内容片段}}

**负面代表**（来源：{{来源3}}, {{来源4}}）：
> {{引用负面内容片段}}

## 板块 6：主题分析
**核心关联主题（Top 5）**
| 排名 | 主题 | 共现率 |
|------|------|--------|
| 1 | {{主题1}} | {{X}}% |
| 2 | {{主题2}} | {{Y}}% |
| 3 | {{主题3}} | {{Z}}% |
| 4 | {{主题4}} | {{W}}% |
| 5 | {{主题5}} | {{V}}% |

## 板块 7：引用分析
### 7.1 来源分类统计
| 来源类型 | 占比 | 代表来源 |
|----------|------|----------|
| 官网引用 | {{X}}% | {{...}} |
| 权威媒体 | {{Y}}% | {{...}} |
| 学术/研报 | {{Z}}% | {{...}} |
| 社交/论坛 | {{W}}% | {{...}} |
| 电商评论 | {{V}}% | {{...}} |

### 7.2 引用习惯对比
| 平台 | 偏好引用来源 | 特点 |
|------|--------------|------|
| 国内新闻 | {{...}} | {{...}} |
| 投资分析 | {{...}} | {{...}} |
| AI平台 | {{...}} | {{...}} |

## 板块 8：提示词列表
（按查询类型列出，每个问题一行）
| 查询类型 | 问题 | 响应摘要 |
|----------|------|----------|
| 品牌认知 | 「什么是{{${brand.name}}}？」 | {{摘要}} |
| 产品评价 | 「{{${brand.name}}}好不好用？」 | {{摘要}} |
| 竞品对比 | 「{{${brand.name}}}和{{竞品}}哪个好？」 | {{摘要}} |
| 使用方法 | 「{{${brand.name}}}怎么用？」 | {{摘要}} |
| 最新动态 | 「{{${brand.name}}}最新消息」 | {{摘要}} |
| 价格相关 | 「{{${brand.name}}}价格怎么样？」 | {{摘要}} |
| 官方信息 | 「{{${brand.name}}}官网是什么？」 | {{摘要}} |
| 口碑与评价 | 「{{${brand.name}}}口碑怎么样？」 | {{摘要}} |

## 板块 9：答案快照
（针对转化意图最强的问题，摘取代表性回答）
**问题**：「{{转化问题，如"品牌值得信任吗？"}}」
**来源**：{{URL}}
**原文摘录**：
> {{关键段落}}

## 板块 10：改进建议 + 竞品分析
### 10.1 竞品设置说明
| 竞品 | 选择依据 |
|------|----------|
| {{竞品A}} | {{依据}} |
| {{竞品B}} | {{依据}} |

### 10.2 竞品品牌分析表
| 指标 | {{${brand.name}}} | {{竞品A}} | {{竞品B}} |
|------|----------|-----------|-----------|
| 市场份额 | {{X}}% | {{X}}% | {{X}}% |
| 情感正面率 | {{X}}% | {{X}}% | {{X}}% |
| AI 提及率 | {{X}}% | {{X}}% | {{X}}% |
| 官方引用率 | {{X}}% | {{X}}% | {{X}}% |

### 10.3 竞品提示词分析
**{{竞品A}}**：
- 核心策略：{{...}}
- AI 关联：{{...}}

**{{竞品B}}**：
- 核心策略：{{...}}
- AI 关联：{{...}}

### 10.4 SEO / GEO 改进建议
| 行动 | 预期效果 | 优先级 |
|------|----------|--------|
| {{行动1}} | {{预期效果}} | P0/P1/P2 |
| {{行动2}} | {{预期效果}} | P0/P1/P2 |
| {{行动3}} | {{预期效果}} | P0/P1/P2 |

品牌信息：
- 品牌名称：${brand.name}
- 品牌网站：${brand.website || '未知'}

请严格按照以上模板格式返回分析结果，将所有{{占位符}}替换为实际数据。`;

    console.log('开始调用OpenClaw智能体:', llmApiUrl);

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

      console.log('API响应状态:', response.status);

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
      console.log('API响应数据:', JSON.stringify(responseData, null, 2));

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

      console.log('智能体返回内容:', content.substring(0, 500) + '...');

      // 使用geoParser解析智能体返回的模板格式数据
      const parseResult = parseGEOReport(content);

      if (!parseResult.success) {
        console.error('解析失败:', parseResult.errors);
        return {
          error: {
            module: 'aiService.performAIAnalysis',
            function: 'parseGEOReport',
            message: '解析智能体返回数据失败',
            details: parseResult.errors.join('; ')
          }
        };
      }

      // 验证解析结果
      const validation = validateReport(parseResult.data);
      if (!validation.valid) {
        console.warn('数据验证警告:', validation.warnings);
      }

      console.log('成功解析智能体返回的数据');
      return parseResult.data;

    } catch (error) {
      console.error('调用OpenClaw智能体失败:', error);
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
    console.error('品牌分析流程失败:', error);
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

module.exports = {
  performAIAnalysis,
  performPromptAnalysis,
  generateArticle,
  aiChat
};
