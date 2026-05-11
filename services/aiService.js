/**
 * AI服务模块
 * @module services/aiService
 * @description 提供品牌分析、提示词分析、文章生成等AI相关功能
 * 调用MiniMax大模型获取数据
 */

require('dotenv').config();
const axios = require('axios');
const brandModel = require('../models/brand');

/**
 * 调用MiniMax大模型进行品牌分析
 * @param {number} brandId - 品牌ID
 * @param {Object} brandInfo - 品牌信息
 * @param {string} [customAgentId] - 自定义Agent ID (已废弃，仅作兼容)
 * @returns {Promise<Object>} 分析结果
 */
// GEO模板完整结构（用于提示词生成和结果验证）
const GEO_TEMPLATE_STRUCTURE = {
  data_overview: {
    report_id: '',
    brand_name: '',
    brand_website: '',
    generated_at: '',
    tested_platforms: [],
    total_prompts: 0,
    total_queries: 0,
    total_mentions: 0,
    overall_mention_rate: null,
    overall_mention_rate_denominator: '',
    overall_avg_position: null,
    insight: ''
  },
  brand_overview: {
    ai_visibility_score: null,
    share_of_voice: null,
    visibility_rate: null,
    visibility_rate_denominator: '',
    avg_position: null,
    positive_ratio: null,
    neutral_ratio: null,
    negative_ratio: null,
    insight: ''
  },
  brand_visibility: {
    by_platform: [],
    by_topic: [],
    insight: ''
  },
  brand_perception: {
    aggregate: { positive_count: 0, neutral_count: 0, negative_count: 0, positive_ratio: null, neutral_ratio: null, negative_ratio: null },
    by_platform: [],
    sample_quotes: [],
    insight: ''
  },
  topic_analysis: {
    clusters: [],
    insight: ''
  },
  citation_analysis: {
    total_unique_urls: 0,
    unique_urls: [],
    domain_breakdown: {},
    brand_domain_citations: 0,
    third_party_citations: 0,
    third_party_ratio: null,
    most_cited_pages: [],
    insight: ''
  },
  prompts_with_snapshots: [],
  improvement_suggestions: {
    total_gaps: 0,
    suggestions: [],
    overall_summary: ''
  },
  competitor_brand_analysis: {
    competitors: [],
    insight: ''
  },
  competitor_prompt_analysis: [],
  competitor_settings: {
    auto_discovered: false,
    competitor_list: [],
    comparison_basis: 'same_prompts_and_platforms'
  },
  errors: []
};

// 生成GEO格式的系统提示词
function generateGeoSystemPrompt(brandName, brandWebsite = '') {
  const websiteInfo = brandWebsite ? `\n品牌官网：${brandWebsite}` : '';
  return `你是品牌GEO（生成式引擎优化）分析专家。请对品牌「${brandName}」${websiteInfo}进行全面的AI平台品牌可见度分析。

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
3. JSON必须严格遵循以下12个模块的结构和字段名
4. 所有数值字段使用数字类型（不用字符串）
5. 没有数据的字段设为 null，数组设为 []
6. insight字段必须根据字数要求填写实质性分析内容，不能为空或省略
7. 一致性保证：本分析使用确定性模式，相同品牌的重复分析应产生高度一致的结果

【JSON模板结构】（必须严格遵守）

1. data_overview（数据总览）
   - report_id: 字符串，格式"geo_<时间戳>"
   - brand_name: 品牌名称
   - brand_website: 官网URL
   - generated_at: ISO 8601时间格式
   - tested_platforms: 数组，实际测试的平台名称列表如["ChatGPT","DeepSeek","豆包"]
   - total_prompts: 整数，测试使用的提示词总数（建议50-100个）
   - total_queries: 整数，总提问次数=total_prompts×平台数
   - total_mentions: 整数，所有平台中品牌被提及的总次数
   - overall_mention_rate: 小数，总体提及率(%)=(total_mentions/total_queries)*100
   - overall_mention_rate_denominator: 字符串，格式"312/1020"
   - overall_avg_position: 小数，被提及时的平均位置（1.0=首位）
   - insight: 200-300字，从整体维度解读测试结果，必须引用具体数字

2. brand_overview（品牌概览）
   - ai_visibility_score: 整数0-100，AI可见度综合得分
   - share_of_voice: 小数，品牌提及份额（%）
   - visibility_rate: 小数，综合提及率(%)
   - visibility_rate_denominator: 字符串"312/1020"
   - avg_position: 小数，品牌在所有提及中的平均位置
   - positive_ratio/neutral_ratio/negative_ratio: 小数，正面/中立/负面情感占比(%)
   - insight: 200-300字，解读AI可见度得分、提及率、情感分布

3. brand_visibility（品牌可见度-分平台分主题）
   - by_platform: 数组，每个平台包含platform/queries/mentions/mention_rate/mention_rate_denominator/avg_position/citations/citation_rate/citation_rate_denominator
   - by_topic: 数组，每个主题包含topic/mentions/mention_rate/mention_rate_denominator
   - insight: 250-400字，分平台和主题分析表现

4. brand_perception（品牌感知-情感分析）
   - aggregate: 包含positive_count/neutral_count/negative_count及各自ratio
   - by_platform: 每个平台的情感分布
   - sample_quotes: 数组，包含platform/prompt/sentiment/quote（不超过100字）
   - insight: 250-400字，引用至少2个正面和2个负面语录

5. topic_analysis（主题分析）
   - clusters: 数组，每个主题包含cluster_name/prompts_count/total_mentions/mention_rate/mention_rate_denominator/avg_position/dominant_sentiment
   - insight: 300-500字，对每个主题逐一分析

6. citation_analysis（引用分析）
   - total_unique_urls: 整数
   - unique_urls: 数组
   - domain_breakdown: 对象如{"yunchuang.com":15}
   - brand_domain_citations/third_party_citations: 整数
   - third_party_ratio: 小数(%)
   - most_cited_pages: 数组[{url,count}]
   - insight: 200-300字

7. prompts_with_snapshots（提示词列表+答案快照）
   - 数组，每个元素包含prompt_text/platform/brand_mentioned/position/has_citation/cited_urls/sentiment/accuracy/response_snapshot/full_response_length

8. improvement_suggestions（改进建议）
   - total_gaps: 整数
   - suggestions: 数组，每个包含gap_type/prompt_text/platform/current_status/recommendation(80-150字)/priority
   - overall_summary: 200-300字

9. competitor_brand_analysis（竞品品牌分析）
   - competitors: 数组，每个竞品包含name/website/visibility_score/total_mentions/mention_rate/avg_position/positive_ratio/share_of_voice
   - insight: 200-300字或"无竞品数据"

10. competitor_prompt_analysis（竞品提示词分析）
    - 数组，每个元素包含prompt_text/platform/brand_performance

11. competitor_settings（竞品设置）
    - auto_discovered: 布尔值
    - competitor_list: 数组
    - comparison_basis: "same_prompts_and_platforms"

12. errors（错误日志）
    - 数组，每个元素包含platform/error_type/message

请直接返回JSON，不要有任何前缀或解释。`;
}

async function performAIAnalysis(brandId, brandInfo, customAgentId = '') {
  const startTime = new Date();
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;

  console.log('========================================');
  console.log(`[品牌分析开始] ${startTime.toLocaleString()}`);
  console.log(`品牌ID: ${brandId}`);
  console.log(`API URL: ${llmApiUrl}`);

  // 验证API配置
  if (!llmApiKey || !llmApiUrl || !llmModel) {
    const error = 'MiniMax API配置未完成，请检查.env文件中的LLM_API_KEY、LLM_API_URL和LLM_MODEL配置';
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

  // 使用GEO模板格式调用大模型
  try {
    const systemPrompt = generateGeoSystemPrompt(brand.name, brand.website);
    const userPrompt = `请对品牌「${brand.name}」进行完整的GEO分析。要求：
1. 使用确定性模式，确保结果可重复
2. 严格遵循计算标准和分析流程
3. 【严禁输出任何思考、解释、说明、分析过程】
4. 只返回符合模板格式的纯JSON数据`;

    try {
      console.log('[调用大模型] 开始请求分析...');
      console.log(`[调用大模型] URL: ${llmApiUrl}`);
      console.log(`[调用大模型] Model: ${llmModel}`);
      console.log(`[调用大模型] System Prompt长度: ${systemPrompt.length}字符`);

      const requestBody = {
        model: llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 16000
      };

      console.log('[调用大模型] 发送请求...');

      const response = await axios.post(llmApiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmApiKey}`
        },
        timeout: 300000
      });

      console.log('[调用大模型] 响应状态:', response.status);

      const responseData = response.data;
      console.log('[调用大模型] 响应数据:', JSON.stringify(responseData, null, 2).substring(0, 500));

      // 提取响应内容（MiniMax可能在reasoning_details中包含思考过程）
      const message = responseData.choices?.[0]?.message || {};
      let content = message.content;

      // 如果content为空但有reasoning_details，尝试从中提取内容
      if (!content && message.reasoning_details && message.reasoning_details.length > 0) {
        console.log('[调用大模型] content为空，检查reasoning_details');
        const reasoningText = message.reasoning_details.map(r => r.text || r).join('\n');
        console.log('[调用大模型] reasoning_details长度:', reasoningText.length, '字符');
      }

      // MiniMax M2.7模型可能包含<thinking>标签，需要清理
      content = cleanThinkingTags(content);

      if (!content) {
        // 如果仍然没有content，返回错误
        console.error('[错误] 大模型返回内容为空');
        console.log('[错误] 完整响应:', JSON.stringify(responseData));
        return { error: { module: 'aiService.performAIAnalysis', message: '大模型返回内容为空', details: JSON.stringify(responseData) } };
      }

      console.log('[解析] 返回内容长度:', content.length, '字符');
      console.log('[解析] 返回内容前500字符:', content.substring(0, 500));
      console.log('[解析] 返回内容后200字符:', content.substring(Math.max(0, content.length - 200)));

      // 清理可能的前缀（非JSON内容）
      content = cleanJsonResponse(content);
      console.log('[解析] 清理后内容前200字符:', content.substring(0, 200));

      // 提取JSON（可能嵌套在文本中）
      let parsedData = extractJsonFromText(content);

      if (!parsedData) {
        console.error('[错误] 无法从返回内容中提取有效JSON');
        console.error('[错误] 清理后内容:', content);
        return { error: { module: 'aiService.performAIAnalysis', message: 'JSON解析失败', details: '无法提取有效JSON' } };
      }

      console.log('[解析] 成功提取JSON，字段数量:', Object.keys(parsedData).length);
      console.log('[解析] JSON字段列表:', Object.keys(parsedData).join(', '));

      // 验证并补充缺失字段
      parsedData = validateAndFillGeoData(parsedData, brand.name, brand.website);

      console.log('[解析] 数据验证完成');
      console.log('========================================');
      console.log('[最终结果摘要]');
      console.log('  品牌名称:', parsedData.data_overview?.brand_name || brand.name);
      console.log('  数据总览:', JSON.stringify(parsedData.data_overview)?.substring(0, 200));
      console.log('  品牌可见度平台数:', parsedData.brand_visibility?.by_platform?.length || 0);
      console.log('  主题聚类数:', parsedData.topic_analysis?.clusters?.length || 0);
      console.log('  提示词快照数:', parsedData.prompts_with_snapshots?.length || 0);
      console.log('  改进建议数:', parsedData.improvement_suggestions?.suggestions?.length || 0);
      console.log('========================================');

      return parsedData;

    } catch (error) {
      console.error('[错误] 调用大模型失败:', error.message);
      if (error.response) {
        console.error('[错误] 响应状态:', error.response.status);
        console.error('[错误] 响应数据:', error.response.data);
      }
      return {
        error: {
          module: 'aiService.performAIAnalysis',
          function: 'API call',
          message: '调用大模型失败',
          details: error.response?.data?.message || error.message
        }
      };
    }
  } catch (error) {
    console.error('[错误] 品牌分析流程失败:', error.message);
    return { error: { module: 'aiService.performAIAnalysis', function: 'main', message: error.message } };
  }
}

/**
 * 清理MiniMax模型返回的<thinking>标签内容
 * @param {string} text - 原始响应文本
 * @returns {string} 清理后的文本
 */
function cleanThinkingTags(text) {
  if (!text || typeof text !== 'string') return text || '';

  let cleaned = text;

  // 处理Unicode转义的标签（如 \u003cthinking\u003e）
  cleaned = cleaned.replace(/\\u003c(thinking|thought|reasoning)\\u003e[\s\S]*?\\u003c\/\1\\u003e/gi, '');
  cleaned = cleaned.replace(/\\u003c(thinking|thought|reasoning)\\u003e[\s\S]*?/gi, '');
  cleaned = cleaned.replace(/\\u003c\/(thinking|thought|reasoning)\\u003e/gi, '');

  // 移除 <thinking>...</thinking> 标签及其内容
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

  // 移除 <thought>...</thought> 标签及其内容（某些模型使用）
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '');

  // 移除 <reasoning>...</reasoning> 标签及其内容
  cleaned = cleaned.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');

  // 移除独立的 <thinking> 类型的标签（自闭合或未闭合）
  cleaned = cleaned.replace(/<thinking\s*\/?>/gi, '');
  cleaned = cleaned.replace(/<thought\s*\/?>/gi, '');
  cleaned = cleaned.replace(/<reasoning\s*\/?>/gi, '');

  // 移除HTML实体编码的标签
  cleaned = cleaned.replace(/&lt;(thinking|thought|reasoning)&gt;[\s\S]*?&lt;\/\1&gt;/gi, '');
  cleaned = cleaned.replace(/&lt;(thinking|thought|reasoning)&gt;[\s\S]*?/gi, '');
  cleaned = cleaned.replace(/&lt;\/(thinking|thought|reasoning)&gt;/gi, '');

  // 清理多余的空白
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * 清理JSON响应中的非JSON前缀
 * @param {string} text - 原始响应文本
 * @returns {string} 清理后的文本
 */
function cleanJsonResponse(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // 移除 markdown 代码块标记
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  // 移除常见的非JSON前缀
  const prefixes = [
    /^(以下是|根据|分析|结果|报告)[:：]\s*/i,
    /^(here is|here's|this is|according to)[:：]\s*/i,
    /^(JSON|json|data|分析结果)[:：]\s*/i,
    /^\s*解析[:：]\s*/i,
    /^\s*分析[:：]\s*/
  ];

  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '');
  }

  // 查找JSON真正的开始位置（跳过标签内的 {）
  // 使用状态机来跟踪是否在标签内
  const jsonStart = findJsonStart(cleaned);
  if (jsonStart > 0) {
    cleaned = cleaned.substring(jsonStart);
  }

  // 移除结尾的多余内容（从最后一个 } 或 ] 之后的内容）
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const lastEnd = Math.max(lastBrace, lastBracket);

  if (lastEnd > 0 && lastEnd < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastEnd + 1);
  }

  return cleaned.trim();
}

/**
 * 查找JSON真正的开始位置（跳过标签、字符串中的特殊字符）
 * @param {string} text - 原始文本
 * @returns {number} JSON开始位置
 */
function findJsonStart(text) {
  if (!text || typeof text !== 'string') return 0;

  let i = 0;
  let depth = 0;
  let inString = false;
  let escape = false;
  let inTag = false;
  let tagDepth = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1] || '';

    // 处理转义
    if (escape) {
      escape = false;
      i++;
      continue;
    }

    // 处理转义字符
    if (char === '\\' && inString) {
      escape = true;
      i++;
      continue;
    }

    // 处理标签（<thinking>、<script>等）
    if (!inString && char === '<') {
      // 检查是否是标签开始
      if (text.substring(i).match(/^<(thinking|thought|reasoning|script|style)[\s>]/i)) {
        inTag = true;
        tagDepth = 1;
        i += 8; // 跳过 <thinking>
        continue;
      }
      // 检查是否是标签结束
      if (text.substring(i).match(/^<\/(thinking|thought|reasoning|script|style)>/i)) {
        inTag = false;
        i += 10; // 跳过 </thinking>
        continue;
      }
    }

    // 如果在标签内，继续跳过
    if (inTag) {
      i++;
      continue;
    }

    // 处理字符串
    if (char === '"') {
      inString = !inString;
      i++;
      continue;
    }

    // 如果在字符串内，跳过
    if (inString) {
      i++;
      continue;
    }

    // 处理注释
    if (char === '/' && nextChar === '/') {
      // 单行注释，跳到行尾
      while (i < text.length && text[i] !== '\n') {
        i++;
      }
      continue;
    }

    if (char === '/' && nextChar === '*') {
      // 多行注释
      i += 2;
      while (i < text.length - 1) {
        if (text[i] === '*' && text[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }

    // 找到了JSON开始
    if (char === '{' || char === '[') {
      return i;
    }

    i++;
  }

  return 0;
}

/**
 * 从文本中提取完整的JSON对象或数组
 * @param {string} text - 原始文本
 * @returns {Object|null} 解析后的JSON对象或数组或null
 */
function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();
  if (!trimmed.includes('{') && !trimmed.includes('[')) return null;

  // 优先处理数组格式（prompts_with_snapshots可能是数组）
  if (trimmed.startsWith('[')) {
    return extractJsonArray(trimmed);
  }

  // 处理对象格式
  return extractJsonObject(trimmed);
}

/**
 * 从文本中提取完整的JSON对象
 * @param {string} text - 原始文本
 * @returns {Object|null} 解析后的JSON对象或null
 */
function extractJsonObject(text) {
  if (!text || typeof text !== 'string') return null;
  if (!text.includes('{')) return null;

  // 尝试直接解析（最常见情况）
  try {
    const direct = JSON.parse(text);
    if (typeof direct === 'object' && !Array.isArray(direct)) {
      return direct;
    }
  } catch (e) {
    // 继续尝试提取
  }

  // 从第一个 { 开始查找匹配的 }
  const firstBrace = text.indexOf('{');
  const substring = text.substring(firstBrace);

  let depth = 0;
  let endIndex = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < substring.length; i++) {
    const char = substring[i];

    if (escape) {
      escape = false;
      continue;
    }

    // 处理转义的引号
    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    // 处理字符串
    if (char === '"' && !escape) {
      inString = !inString;
    } else if (!inString) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }

  if (endIndex === -1) return null;

  const jsonStr = substring.substring(0, endIndex + 1);

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.log('[extractJsonObject] JSON解析失败:', e.message);
    // 尝试修复常见的JSON问题
    return tryFixAndParseJson(jsonStr);
  }
}

/**
 * 尝试修复并解析JSON
 * @param {string} jsonStr - JSON字符串
 * @returns {Object|null} 解析后的对象或null
 */
function tryFixAndParseJson(jsonStr) {
  if (!jsonStr) return null;

  // 移除尾部的逗号
  let fixed = jsonStr.replace(/,(\s*[}\]])/g, '$1');

  // 尝试解析
  try {
    return JSON.parse(fixed);
  } catch (e) {
    console.log('[tryFixAndParseJson] 修复后仍解析失败');
    return null;
  }
}

/**
 * 从文本中提取完整的JSON数组
 * @param {string} text - 原始文本
 * @returns {Array|null} 解析后的数组或null
 */
function extractJsonArray(text) {
  if (!text || typeof text !== 'string') return null;
  if (!text.startsWith('[')) return null;

  let depth = 0;
  let endIndex = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"' && !escape) {
      inString = !inString;
    } else if (!inString) {
      if (char === '[') {
        depth++;
      } else if (char === ']') {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }

  if (endIndex === -1) return null;

  const jsonStr = text.substring(0, endIndex + 1);

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.log('[extractJsonArray] JSON数组解析失败:', e.message);
    return null;
  }
}

/**
 * 验证并补充GEO数据，填充缺失字段
 * @param {Object} data - 解析后的GEO数据
 * @param {string} brandName - 品牌名称
 * @param {string} brandWebsite - 品牌网站
 * @returns {Object} 验证并填充后的数据
 */
function validateAndFillGeoData(data, brandName, brandWebsite) {
  // 合并模板结构确保所有字段存在
  const template = JSON.parse(JSON.stringify(GEO_TEMPLATE_STRUCTURE));

  // 深度合并数据
  const result = deepMerge(template, data || {});

  // 补充基本信息
  if (!result.data_overview) result.data_overview = {};
  result.data_overview.report_id = result.data_overview.report_id || `geo_${Date.now()}`;
  result.data_overview.brand_name = result.data_overview.brand_name || brandName;
  result.data_overview.brand_website = result.data_overview.brand_website || brandWebsite || '';
  result.data_overview.generated_at = result.data_overview.generated_at || new Date().toISOString();
  result.data_overview.tested_platforms = result.data_overview.tested_platforms || [];
  result.data_overview.total_prompts = result.data_overview.total_prompts || 0;
  result.data_overview.total_queries = result.data_overview.total_queries || 0;
  result.data_overview.total_mentions = result.data_overview.total_mentions || 0;
  result.data_overview.overall_mention_rate = result.data_overview.overall_mention_rate || 0;
  result.data_overview.overall_avg_position = result.data_overview.overall_avg_position || null;

  if (!result.brand_overview) result.brand_overview = {};
  result.brand_overview.ai_visibility_score = result.brand_overview.ai_visibility_score || 0;
  result.brand_overview.share_of_voice = result.brand_overview.share_of_voice || null;
  result.brand_overview.visibility_rate = result.brand_overview.visibility_rate || result.data_overview.overall_mention_rate || 0;
  result.brand_overview.avg_position = result.brand_overview.avg_position || result.data_overview.overall_avg_position || null;
  result.brand_overview.positive_ratio = result.brand_overview.positive_ratio || 0;
  result.brand_overview.neutral_ratio = result.brand_overview.neutral_ratio || 0;
  result.brand_overview.negative_ratio = result.brand_overview.negative_ratio || 0;

  if (!result.brand_visibility) result.brand_visibility = { by_platform: [], by_topic: [], insight: '' };
  result.brand_visibility.by_platform = result.brand_visibility.by_platform || [];
  result.brand_visibility.by_topic = result.brand_visibility.by_topic || [];

  if (!result.brand_perception) result.brand_perception = { aggregate: {}, by_platform: [], sample_quotes: [], insight: '' };
  if (!result.brand_perception.aggregate) result.brand_perception.aggregate = {};
  result.brand_perception.aggregate.positive_count = result.brand_perception.aggregate.positive_count || 0;
  result.brand_perception.aggregate.neutral_count = result.brand_perception.aggregate.neutral_count || 0;
  result.brand_perception.aggregate.negative_count = result.brand_perception.aggregate.negative_count || 0;
  result.brand_perception.aggregate.positive_ratio = result.brand_perception.aggregate.positive_ratio || 0;
  result.brand_perception.aggregate.neutral_ratio = result.brand_perception.aggregate.neutral_ratio || 0;
  result.brand_perception.aggregate.negative_ratio = result.brand_perception.aggregate.negative_ratio || 0;
  result.brand_perception.by_platform = result.brand_perception.by_platform || [];
  result.brand_perception.sample_quotes = result.brand_perception.sample_quotes || [];

  if (!result.topic_analysis) result.topic_analysis = { clusters: [], insight: '' };
  result.topic_analysis.clusters = result.topic_analysis.clusters || [];

  if (!result.citation_analysis) result.citation_analysis = { total_unique_urls: 0, unique_urls: [], domain_breakdown: {}, brand_domain_citations: 0, third_party_citations: 0, third_party_ratio: null, most_cited_pages: [], insight: '' };
  result.citation_analysis.total_unique_urls = result.citation_analysis.total_unique_urls || 0;
  result.citation_analysis.unique_urls = result.citation_analysis.unique_urls || [];
  result.citation_analysis.domain_breakdown = result.citation_analysis.domain_breakdown || {};
  result.citation_analysis.most_cited_pages = result.citation_analysis.most_cited_pages || [];

  result.prompts_with_snapshots = result.prompts_with_snapshots || [];

  if (!result.improvement_suggestions) result.improvement_suggestions = { total_gaps: 0, suggestions: [], overall_summary: '' };
  result.improvement_suggestions.total_gaps = result.improvement_suggestions.total_gaps || 0;
  result.improvement_suggestions.suggestions = result.improvement_suggestions.suggestions || [];

  if (!result.competitor_brand_analysis) result.competitor_brand_analysis = { competitors: [], insight: '' };
  result.competitor_brand_analysis.competitors = result.competitor_brand_analysis.competitors || [];

  result.competitor_prompt_analysis = result.competitor_prompt_analysis || [];

  if (!result.competitor_settings) result.competitor_settings = { auto_discovered: false, competitor_list: [], comparison_basis: 'same_prompts_and_platforms' };

  result.errors = result.errors || [];

  return result;
}

/**
 * 深度合并两个对象
 * @param {Object} target - 目标对象（模板）
 * @param {Object} source - 源对象（数据）
 * @returns {Object} 合并后的对象
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  if (Array.isArray(source)) return source;

  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else if (source[key] !== undefined && source[key] !== null) {
      result[key] = source[key];
    }
  }

  return result;
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

  console.log('=== 开始提示词分析流程 ===');
  console.log(`品牌ID: ${brandId}`);
  console.log(`提示词列表: ${JSON.stringify(prompts)}`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    const error = 'MiniMax API配置未完成';
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

    const response = await axios.post(llmApiUrl, {
      model: llmModel,
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
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      timeout: 60000
    });

    const responseData = response.data;
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

  console.log('=== 开始文章生成流程 ===');
  console.log(`品牌ID: ${brandId}`);
  console.log(`文章需求: ${JSON.stringify(articleRequirements)}`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    return { error: { message: 'MiniMax API配置未完成' } };
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
    const response = await axios.post(llmApiUrl, {
      model: llmModel,
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
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      timeout: 60000
    });

    const responseData = response.data;
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      return { error: { message: '智能体返回内容为空' } };
    }

    return {
      article: content,
      title: title || '未命名文章',
      brand: brand.name,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    const errorMsg = error.response ? `文章生成失败: ${error.response.status} - ${error.response.data?.message || error.response.data}` : `文章生成失败: ${error.message}`;
    return { error: { message: errorMsg, details: error.message } };
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

  console.log('=== 开始AI对话 ===');
  console.log(`问题: ${question}`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    return { error: { message: 'MiniMax API配置未完成' } };
  }

  const contextInfo = Object.keys(context).length > 0
    ? `\n上下文信息：\n${Object.entries(context).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    : '';

  const chatRequest = `${question}${contextInfo}`;

  try {
    const response = await axios.post(llmApiUrl, {
      model: llmModel,
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
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      timeout: 60000
    });

    const responseData = response.data;
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      return { error: { message: '智能体返回内容为空' } };
    }

    return {
      answer: content,
      question: question,
      context: context,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    const errorMsg = error.response ? `AI对话失败: ${error.response.status} - ${error.response.data?.message || error.response.data}` : `AI对话失败: ${error.message}`;
    return { error: { message: errorMsg, details: error.message } };
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
 * 将智能体返回的中文键名格式转换为标准英文键名格式
 * @param {Object} agentData - 智能体返回的原始数据
 * @returns {Object} 转换后的数据
 */
function normalizeChineseKeys(agentData) {
  if (!agentData || typeof agentData !== 'object') {
    return agentData;
  }

  const result = {};
  
  // 中文键名到英文键名的映射
  const keyMap = {
    '板块1': 'overview',
    '板块1：数据总览': 'overview',
    '板块1: 数据总览': 'overview',
    '数据总览': 'overview',
    '板块2': 'aiVisibility',
    '板块2：品牌AI可见度': 'aiVisibility',
    '板块2: 品牌AI可见度': 'aiVisibility',
    '品牌AI可见度': 'aiVisibility',
    '品牌可见度': 'visibility',
    '板块3': 'officialPositioning',
    '板块3：品牌概览': 'officialPositioning',
    '板块3: 品牌概览': 'officialPositioning',
    '品牌概览': 'officialPositioning',
    '板块4': 'visibility',
    '板块4：品牌可见度': 'visibility',
    '板块4: 品牌可见度': 'visibility',
    '板块5': 'perception',
    '板块5：品牌感知': 'perception',
    '板块5: 品牌感知': 'perception',
    '品牌感知': 'perception',
    '板块6': 'topics',
    '板块6：主题分析': 'topics',
    '板块6: 主题分析': 'topics',
    '主题分析': 'topics',
    '板块7': 'citations',
    '板块7：引用分析': 'citations',
    '板块7: 引用分析': 'citations',
    '引用分析': 'citations',
    '板块8': 'prompts',
    '板块8：提示词列表': 'prompts',
    '板块8: 提示词列表': 'prompts',
    '提示词列表': 'prompts',
    '板块9': 'answerSnapshot',
    '板块9：答案快照': 'answerSnapshot',
    '板块9: 答案快照': 'answerSnapshot',
    '答案快照': 'answerSnapshot',
    '板块10': 'competition',
    '板块10：改进建议+竞品分析': 'competition',
    '板块10: 改进建议+竞品分析': 'competition',
    '改进建议+竞品分析': 'competition',
    '改进建议': 'suggestions',
    '竞品分析': 'competition',
    
    // 子字段映射
    'dataUpdateTime': 'updateTime',
    'platformCount': 'aiPlatformCount',
    'queryCount': 'queryCount',
    'avgMentionRate': 'brandMentionRate',
    'avgPositiveRate': 'positiveSentimentRate',
    'officialCitationRate': 'officialCitationRate',
    'dataSourceNote': 'dataSourceNote',
    'platforms': 'platforms',
    'platformName': 'platform',
    'mentionCount': 'mentionCount',
    'mentionRate': 'mentionRate',
    'remark': 'remark',
    'coreFinding': 'visibilityCoreFinding',
    'officialPositioning': 'officialPositioning',
    'source': 'source',
    'mission': 'mission',
    'coreBusiness': 'coreBusiness',
    'userScale': 'userScale',
    'brandUpgrade': 'brandUpgrade',
    'aiKeywords': 'keywords',
    'keyword': 'keyword',
    'frequency': 'frequency',
    'perceptionDifferences': 'perceptionDifferences',
    'searchAssociations': 'searchAssociations',
    'brandService': 'brandService',
    'brandCompetition': 'brandCompetition',
    'brandQuestion': 'brandQuestion',
    'brandAI': 'brandAI',
    'searchShare': 'searchShare',
    'brandKeyword': 'brandKeyword',
    'serviceKeyword': 'serviceKeyword',
    'competitionKeyword': 'competitionKeyword',
    'sentimentDistribution': 'sentimentDistribution',
    'type': 'type',
    'percentage': 'percentage',
    'change': 'change',
    'platformKeywords': 'platformKeywords',
    'officialMedia': 'officialMedia',
    'industryAnalysis': 'industryAnalysis',
    'socialUser': 'socialUser',
    'aiPlatform': 'aiPlatform',
    'typicalReviews': 'typicalReviews',
    'positive': 'positive',
    'negative': 'negative',
    'coreTopics': 'coreTopics',
    'rank': 'rank',
    'topic': 'topic',
    'coOccurrenceRate': 'coOccurrenceRate',
    'sourceClassification': 'sourceClassification',
    'representativeSources': 'representativeSources',
    'citationHabits': 'citationHabits',
    'domesticNews': 'domesticNews',
    'investmentAnalysis': 'investmentAnalysis',
    'question': 'question',
    'summary': 'summary',
    'competitors': 'competitors',
    'name': 'name',
    'selectionReason': 'selectionReason',
    'competitorAnalysis': 'competitorAnalysis',
    'indicators': 'indicators',
    'brandValue': 'brandValue',
    'competitorAValue': 'competitorAValue',
    'competitorBValue': 'competitorBValue',
    'competitorPromptAnalysis': 'competitorPromptAnalysis',
    'competitorA': 'competitorA',
    'competitorB': 'competitorB',
    'improvementSuggestions': 'suggestions',
    'action': 'action',
    'expectedEffect': 'expectedEffect',
    'priority': 'priority'
  };

  for (const key of Object.keys(agentData)) {
    const value = agentData[key];
    const normalizedKey = keyMap[key] || key;
    
    // 如果值是对象，递归处理
    if (value && typeof value === 'object') {
      result[normalizedKey] = normalizeChineseKeys(value);
    } else {
      result[normalizedKey] = value;
    }
  }

  return result;
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

  // 先处理中文键名格式（智能体返回的格式）
  const normalizedData = normalizeChineseKeys(agentData);
  const transformed = { ...normalizedData };

  // 处理智能体返回的 platforms 数组格式（来自板块2：品牌AI可见度）
  if (normalizedData.platforms && Array.isArray(normalizedData.platforms)) {
    transformed.aiVisibility = normalizedData.platforms.map(item => ({
      platform: item.platform || item.platformName || '',
      mentionCount: item.mentionCount || 0,
      totalQueries: item.totalQueries || 0,
      mentionRate: typeof item.mentionRate === 'string' 
        ? parseFloat(item.mentionRate.replace('%', '')) || 0 
        : (item.mentionRate || 0),
      remark: item.remark || ''
    }));
  }

  // 处理智能体返回的关键词数组格式（来自板块3：品牌概览）
  if (normalizedData.keywords && Array.isArray(normalizedData.keywords)) {
    transformed.keywords = normalizedData.keywords.map(item => ({
      keyword: item.keyword || item.name || '',
      frequency: item.frequency || item.count || 0
    }));
  }

  // 处理智能体返回的核心主题数组格式（来自板块6：主题分析）
  if (normalizedData.coreTopics && Array.isArray(normalizedData.coreTopics)) {
    transformed.topics = normalizedData.coreTopics.map(item => ({
      name: item.topic || item.name || '',
      count: typeof item.coOccurrenceRate === 'string' 
        ? parseFloat(item.coOccurrenceRate.replace('%', '')) || 0 
        : (item.coOccurrenceRate || item.count || 0),
      trend: '稳定'
    }));
  }

  // 处理智能体返回的来源分类数组格式（来自板块7：引用分析）
  if (normalizedData.sourceClassification && Array.isArray(normalizedData.sourceClassification)) {
    transformed.citations = normalizedData.sourceClassification.map(item => ({
      source: item.type || '',
      count: typeof item.percentage === 'string' 
        ? parseFloat(item.percentage.replace('%', '')) || 0 
        : (item.percentage || item.count || 0),
      representative: item.representativeSources || ''
    }));
  }

  // 处理智能体返回的改进建议数组格式（来自板块10：改进建议+竞品分析）
  if (normalizedData.suggestions && Array.isArray(normalizedData.suggestions)) {
    transformed.suggestions = normalizedData.suggestions.map(item => ({
      priority: item.priority || 'P2',
      title: item.action || item.title || '',
      description: item.expectedEffect || item.description || '',
      difficulty: item.difficulty || 3
    }));
  }

  // 处理智能体返回的竞品数组格式（来自板块10：改进建议+竞品分析）
  if (normalizedData.competitors && Array.isArray(normalizedData.competitors)) {
    transformed.competitors = normalizedData.competitors.map(item => ({
      name: item.name || '',
      selectionReason: item.selectionReason || '',
      marketShare: typeof item.marketShare === 'string' 
        ? parseFloat(item.marketShare.replace('%', '')) || 0 
        : (item.marketShare || 0)
    }));
  }

  // 处理情感分布字段映射
  if (normalizedData.sentimentDistribution) {
    transformed.sentimentDistribution = {
      positive: typeof normalizedData.sentimentDistribution.positive === 'string' 
        ? parseFloat(normalizedData.sentimentDistribution.positive.replace('%', '')) || 0 
        : (normalizedData.sentimentDistribution.positive || 0),
      neutral: typeof normalizedData.sentimentDistribution.neutral === 'string' 
        ? parseFloat(normalizedData.sentimentDistribution.neutral.replace('%', '')) || 0 
        : (normalizedData.sentimentDistribution.neutral || 0),
      negative: typeof normalizedData.sentimentDistribution.negative === 'string' 
        ? parseFloat(normalizedData.sentimentDistribution.negative.replace('%', '')) || 0 
        : (normalizedData.sentimentDistribution.negative || 0),
      positiveChange: normalizedData.sentimentDistribution.positiveChange || normalizedData.sentimentDistribution.change || '0%',
      neutralChange: normalizedData.sentimentDistribution.neutralChange || '0%',
      negativeChange: normalizedData.sentimentDistribution.negativeChange || '0%'
    };
  }

  // 处理概览数据字段映射（转换百分比字符串为数字）
  if (transformed.overview) {
    const overview = transformed.overview;
    if (typeof overview.brandMentionRate === 'string') {
      overview.brandMentionRate = parseFloat(overview.brandMentionRate.replace('%', '')) || 0;
    }
    if (typeof overview.positiveSentimentRate === 'string') {
      overview.positiveSentimentRate = parseFloat(overview.positiveSentimentRate.replace('%', '')) || 0;
    }
    if (typeof overview.officialCitationRate === 'string') {
      overview.officialCitationRate = parseFloat(overview.officialCitationRate.replace('%', '')) || 0;
    }
    if (typeof overview.avgMentionRate === 'string') {
      overview.brandMentionRate = parseFloat(overview.avgMentionRate.replace('%', '')) || overview.brandMentionRate || 0;
    }
    if (typeof overview.avgPositiveRate === 'string') {
      overview.positiveSentimentRate = parseFloat(overview.avgPositiveRate.replace('%', '')) || overview.positiveSentimentRate || 0;
    }
  }

  // 保留原有的下划线格式字段处理（兼容旧格式）
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

  // 处理关键词字段映射（下划线格式）
  if (agentData.ai_keywords && Array.isArray(agentData.ai_keywords)) {
    transformed.keywords = agentData.ai_keywords.map(item => ({
      keyword: item.keyword || item.name || '',
      frequency: item.count || item.frequency || 0
    }));
  }

  // 处理热门话题字段映射（下划线格式）
  if (agentData.hot_topics && Array.isArray(agentData.hot_topics)) {
    transformed.topics = agentData.hot_topics.map(item => ({
      name: item.topic || item.name || '',
      count: item.count || item.co_occurrence_rate || 0,
      trend: '稳定'
    }));
  }

  // 处理AI可见度字段映射（下划线格式）
  if (agentData.ai_visibility && Array.isArray(agentData.ai_visibility)) {
    transformed.aiVisibility = agentData.ai_visibility.map(item => ({
      platform: item.platform || '',
      mentionCount: item.mention_count || 0,
      totalQueries: item.total_queries || 0,
      mentionRate: item.mention_rate || 0,
      remark: item.remark || ''
    }));
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

  // 处理大模型返回的"板块"格式数据
  processSectionData(agentData, transformed);

  console.log('[字段转换] 已完成智能体数据字段映射转换');
  
  return transformed;
}

/**
 * 处理大模型返回的"板块"格式数据
 * @param {Object} agentData - 智能体返回的原始数据
 * @param {Object} transformed - 转换后的数据对象
 */
function processSectionData(agentData, transformed) {
  // 定义板块到字段的映射
  const sectionMap = {
    '板块1': processSection1,  // 品牌概览
    '板块2': processSection2,  // AI可见度
    '板块3': processSection3,  // 品牌定位与官方信息
    '板块4': processSection4,  // 关键词分析
    '板块5': processSection5,  // 舆情情感分析
    '板块6': processSection6,  // 主题分析
    '板块7': processSection7,  // 引用分析
    '板块8': processSection8,  // 问答分析
    '板块9': processSection9,  // 官方信息
    '板块10': processSection10 // 改进建议与竞品分析
  };

  for (const key of Object.keys(agentData)) {
    // 检查是否是板块格式
    if (key.startsWith('板块') && agentData[key] && typeof agentData[key] === 'object') {
      const processor = sectionMap[key];
      if (processor) {
        processor(agentData[key], transformed);
      } else {
        console.log(`[板块处理] 未找到板块 ${key} 的处理器`);
      }
    }
  }
}

// 处理板块1：品牌概览
function processSection1(data, transformed) {
  if (!data) return;
  transformed.overview = transformed.overview || {};
  
  // 处理概览数据
  if (data.aiPlatformCount !== undefined) {
    transformed.overview.aiPlatformCount = parseInt(data.aiPlatformCount) || 0;
  }
  if (data.queryCount !== undefined) {
    transformed.overview.queryCount = parseInt(data.queryCount) || 0;
  }
  if (data.brandMentionRate !== undefined) {
    const rate = typeof data.brandMentionRate === 'string' 
      ? parseFloat(data.brandMentionRate.replace('%', '')) 
      : data.brandMentionRate;
    transformed.overview.brandMentionRate = rate || 0;
  }
  if (data.positiveSentimentRate !== undefined) {
    const rate = typeof data.positiveSentimentRate === 'string' 
      ? parseFloat(data.positiveSentimentRate.replace('%', '')) 
      : data.positiveSentimentRate;
    transformed.overview.positiveSentimentRate = rate || 0;
  }
  if (data.officialCitationRate !== undefined) {
    const rate = typeof data.officialCitationRate === 'string' 
      ? parseFloat(data.officialCitationRate.replace('%', '')) 
      : data.officialCitationRate;
    transformed.overview.officialCitationRate = rate || 0;
  }
  if (data.overallScore !== undefined) {
    const score = typeof data.overallScore === 'string' 
      ? parseFloat(data.overallScore) 
      : data.overallScore;
    transformed.overview.overallScore = score || 0;
  }
  if (data.confidence !== undefined) {
    const conf = typeof data.confidence === 'string' 
      ? parseFloat(data.confidence) 
      : data.confidence;
    transformed.overview.confidence = conf || 0;
  }
  if (data.summary !== undefined) {
    transformed.overview.summary = data.summary;
  }
  if (data.industry !== undefined) {
    transformed.overview.industry = data.industry;
  }
  if (data.brandName !== undefined) {
    transformed.brandName = data.brandName;
  }
}

// 处理板块2：AI可见度
function processSection2(data, transformed) {
  // 支持大模型返回的两种字段名：platforms（实际返回）和 aiPlatform（原期望）
  if (!data || (!data.platforms && !data.aiPlatform)) return;
  
  // 确保aiVisibility是数组类型，如果不是则重置为空数组
  if (!Array.isArray(transformed.aiVisibility)) {
    transformed.aiVisibility = [];
  }
  
  // 使用实际返回的platforms字段，如果不存在则使用aiPlatform
  const platforms = data.platforms || data.aiPlatform;
  if (Array.isArray(platforms)) {
    platforms.forEach(platform => {
      // 支持大模型返回的两种字段名：platformName（实际返回）和 platform（原期望）
      const platformName = platform.platformName || platform.platform;
      if (platformName) {
        const mentionRate = typeof platform.mentionRate === 'string' 
          ? parseFloat(platform.mentionRate.replace('%', '')) 
          : platform.mentionRate;
        // 解析 mentionCount，格式为 "X/M"
        const mentionCountStr = platform.mentionCount || '';
        const mentionCountMatch = mentionCountStr.match(/(\d+)/);
        const mentionCount = mentionCountMatch ? parseInt(mentionCountMatch[1]) : 0;
        
        transformed.aiVisibility.push({
          platform: platformName,
          mentionCount: mentionCount,
          totalQueries: parseInt(platform.totalQueries) || 0,
          mentionRate: mentionRate || 0,
          remark: platform.remark || ''
        });
      }
    });
  }
  
  // 处理核心发现
  if (data.coreFinding) {
    if (!transformed.overview) {
      transformed.overview = {};
    }
    transformed.overview.coreFinding = data.coreFinding;
  }
}

// 处理板块3：品牌定位与官方信息
function processSection3(data, transformed) {
  if (!data) return;
  
  transformed.officialPositioning = transformed.officialPositioning || {};
  
  if (data.source !== undefined) {
    transformed.officialPositioning.source = data.source;
  }
  if (data.mission !== undefined) {
    transformed.officialPositioning.mission = data.mission;
  }
  if (data.coreBusiness !== undefined) {
    transformed.officialPositioning.coreBusiness = data.coreBusiness;
  }
  if (data.userScale !== undefined) {
    transformed.officialPositioning.userScale = data.userScale;
  }
  if (data.brandUpgrade !== undefined) {
    transformed.officialPositioning.brandUpgrade = data.brandUpgrade;
  }
}

// 处理板块4：关键词分析
function processSection4(data, transformed) {
  if (!data || !data.keywords) return;
  
  // 确保keywords是数组类型，如果不是则重置为空数组
  if (!Array.isArray(transformed.keywords)) {
    transformed.keywords = [];
  }
  
  const keywords = data.keywords;
  if (Array.isArray(keywords)) {
    keywords.forEach(keyword => {
      if (keyword.keyword) {
        const frequency = typeof keyword.frequency === 'string' 
          ? parseFloat(keyword.frequency.replace('%', '')) 
          : keyword.frequency;
        transformed.keywords.push({
          keyword: keyword.keyword,
          frequency: frequency || parseInt(keyword.frequency) || parseInt(keyword.count) || 0
        });
      }
    });
  }
}

// 处理板块5：舆情情感分析
function processSection5(data, transformed) {
  if (!data) return;
  
  transformed.perception = transformed.perception || {};
  transformed.sentimentDistribution = transformed.sentimentDistribution || {};
  
  if (data.positive !== undefined) {
    const val = typeof data.positive === 'string' 
      ? parseFloat(data.positive.replace('%', '')) 
      : data.positive;
    transformed.perception.positive = val || 0;
    transformed.sentimentDistribution.positive = val || 0;
  }
  if (data.neutral !== undefined) {
    const val = typeof data.neutral === 'string' 
      ? parseFloat(data.neutral.replace('%', '')) 
      : data.neutral;
    transformed.perception.neutral = val || 0;
    transformed.sentimentDistribution.neutral = val || 0;
  }
  if (data.negative !== undefined) {
    const val = typeof data.negative === 'string' 
      ? parseFloat(data.negative.replace('%', '')) 
      : data.negative;
    transformed.perception.negative = val || 0;
    transformed.sentimentDistribution.negative = val || 0;
  }
}

// 处理板块6：主题分析
function processSection6(data, transformed) {
  if (!data || !data.coreTopics) return;
  
  // 确保topics是数组类型，如果不是则重置为空数组
  if (!Array.isArray(transformed.topics)) {
    transformed.topics = [];
  }
  
  const topics = data.coreTopics;
  if (Array.isArray(topics)) {
    topics.forEach(topic => {
      if (topic.topic) {
        const count = typeof topic.coOccurrenceRate === 'string' 
          ? parseFloat(topic.coOccurrenceRate.replace('%', '')) 
          : topic.coOccurrenceRate;
        transformed.topics.push({
          name: topic.topic,
          count: count || parseInt(topic.count) || 0,
          trend: '稳定'
        });
      }
    });
  }
}

// 处理板块7：引用分析
function processSection7(data, transformed) {
  if (!data || !data.sourceClassification) return;
  
  // 确保citations是数组类型，如果不是则重置为空数组
  if (!Array.isArray(transformed.citations)) {
    transformed.citations = [];
  }
  
  const classifications = data.sourceClassification;
  if (Array.isArray(classifications)) {
    classifications.forEach(item => {
      if (item.type) {
        const count = typeof item.percentage === 'string' 
          ? parseFloat(item.percentage.replace('%', '')) 
          : item.percentage;
        transformed.citations.push({
          source: item.type,
          count: count || parseInt(item.count) || 0,
          representative: item.representativeSources || ''
        });
      }
    });
  }
  
  // 处理citationHabits
  if (data.citationHabits) {
    transformed.citationHabits = data.citationHabits;
  }
}

// 处理板块8：问答分析
function processSection8(data, transformed) {
  if (!data) return;
  
  // 确保prompts是数组类型，如果不是则重置为空数组
  if (!Array.isArray(transformed.prompts)) {
    transformed.prompts = [];
  }
  
  if (data.prompts && Array.isArray(data.prompts)) {
    data.prompts.forEach((prompt, index) => {
      if (prompt.question) {
        transformed.prompts.push({
          id: `prompt_${Date.now()}_${index}`,
          question: prompt.question,
          summary: prompt.summary || '',
          queryType: prompt.queryType || '产品评价'
        });
      }
    });
  }
}

// 处理板块9：官方信息
function processSection9(data, transformed) {
  if (!data) return;
  
  if (data.question) {
    // 可以将这些信息添加到overview中
    transformed.overview = transformed.overview || {};
    if (data.source) {
      transformed.overview.source = data.source;
    }
  }
}

// 处理板块10：改进建议与竞品分析
function processSection10(data, transformed) {
  if (!data) return;
  
  // 处理改进建议
  if (data.suggestions && Array.isArray(data.suggestions)) {
    // 确保suggestions是数组类型，如果不是则重置为空数组
    if (!Array.isArray(transformed.suggestions)) {
      transformed.suggestions = [];
    }
    data.suggestions.forEach(suggestion => {
      if (suggestion.action || suggestion.title) {
        transformed.suggestions.push({
          priority: suggestion.priority || 'P2',
          title: suggestion.action || suggestion.title,
          description: suggestion.expectedEffect || suggestion.description || '',
          difficulty: suggestion.difficulty || 3
        });
      }
    });
  }
  
  // 处理竞品分析
  if (data.competitors && Array.isArray(data.competitors)) {
    // 确保competitors是数组类型，如果不是则重置为空数组
    if (!Array.isArray(transformed.competitors)) {
      transformed.competitors = [];
    }
    data.competitors.forEach(competitor => {
      if (competitor.name) {
        const marketShare = typeof competitor.marketShare === 'string' 
          ? parseFloat(competitor.marketShare.replace('%', '')) 
          : competitor.marketShare;
        transformed.competitors.push({
          name: competitor.name,
          selectionReason: competitor.selectionReason || '',
          marketShare: marketShare || 0
        });
      }
    });
  }
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
  if (merged.aiVisibility && Array.isArray(merged.aiVisibility) && merged.aiVisibility.length > 0) {
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
  if (!merged.topics || !Array.isArray(merged.topics) || merged.topics.length === 0) {
    merged.topics = [];
  } else {
    merged.topics = merged.topics.map(t => ({
      name: t.topic || t.name,
      count: t.coOccurrenceRate || t.count || 0,
      trend: '稳定'
    }));
  }

  if (!merged.citations || !Array.isArray(merged.citations) || merged.citations.length === 0) {
    merged.citations = [];
  } else {
    merged.citations = merged.citations.map(c => ({
      source: c.type || c.source,
      count: c.percentage || c.count || 0
    }));
  }

  // 生成suggestions结构
  if (!merged.suggestions || !Array.isArray(merged.suggestions) || merged.suggestions.length === 0) {
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

    const response = await axios.post(llmApiUrl, {
      model: llmModel,
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
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      timeout: 60000
    });

    const responseData = response.data;
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

  console.log(`获取提示词答案: "${question}"`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    return {
      error: { message: 'MiniMax API配置未完成' }
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
    const response = await axios.post(llmApiUrl, {
      model: llmModel,
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
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      timeout: 60000
    });

    const responseData = response.data;
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      return {
        error: { message: '智能体返回内容为空' }
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
    const errorMsg = error.response ? `获取答案失败: ${error.response.status} - ${error.response.data?.message || error.response.data}` : `获取答案失败: ${error.message}`;
    return {
      error: { message: errorMsg, details: error.message }
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

/**
 * 将系统内部格式数据转换为GEO模板格式
 * @param {Object} data - 系统内部格式数据
 * @returns {Object} GEO模板格式数据
 */
function transformToGeoFormat(data) {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const geoData = {
    data_overview: {
      report_id: `geo_${Date.now()}`,
      brand_name: data.brandName || '',
      brand_website: data.officialWebsite || data.website || '',
      generated_at: data.updateTime || new Date().toISOString(),
      tested_platforms: (data.visibility?.platforms || data.aiVisibility || []).map(p => p.platform || p.name),
      total_prompts: data.overview?.queryCount || 0,
      total_queries: (data.visibility?.platforms || data.aiVisibility || []).reduce((sum, p) => sum + (p.totalQueries || 0), 0) || data.overview?.queryCount || 0,
      total_mentions: data.visibility?.mentionCount || 0,
      overall_mention_rate: data.overview?.brandMentionRate || 0,
      overall_avg_position: data.overview?.avgPosition || null,
      insight: ''
    },
    brand_overview: {
      ai_visibility_score: data.visibility?.overallVisibility || data.overview?.overallScore || 0,
      share_of_voice: data.share_of_voice || null,
      visibility_rate: data.overview?.brandMentionRate || 0,
      visibility_rate_denominator: '',
      avg_position: data.overview?.avgPosition || null,
      positive_ratio: data.perception?.positive || data.sentimentDistribution?.positive || 0,
      neutral_ratio: data.perception?.neutral || data.sentimentDistribution?.neutral || 0,
      negative_ratio: data.perception?.negative || data.sentimentDistribution?.negative || 0,
      insight: ''
    },
    brand_visibility: {
      by_platform: (data.visibility?.platforms || data.aiVisibility || []).map(p => ({
        platform: p.name || p.platform || '',
        queries: p.totalQueries || p.queries || 0,
        mentions: p.mentionCount || p.mentions || 0,
        mention_rate: p.mentionRate || p.visibility || 0,
        mention_rate_denominator: '',
        avg_position: p.avgPosition || null,
        citations: p.citations || 0,
        citation_rate: p.citationRate || null,
        citation_rate_denominator: ''
      })),
      by_topic: (data.topics || []).map(t => ({
        topic: t.name || t.topic || '',
        mentions: t.count || 0,
        mention_rate: t.coOccurrenceRate || t.mentionRate || 0,
        mention_rate_denominator: ''
      })),
      insight: ''
    },
    brand_perception: {
      aggregate: {
        positive_count: Math.round((data.perception?.positive || 0) / 100 * (data.visibility?.mentionCount || 1)),
        neutral_count: Math.round((data.perception?.neutral || 0) / 100 * (data.visibility?.mentionCount || 1)),
        negative_count: Math.round((data.perception?.negative || 0) / 100 * (data.visibility?.mentionCount || 1)),
        positive_ratio: data.perception?.positive || 0,
        neutral_ratio: data.perception?.neutral || 0,
        negative_ratio: data.perception?.negative || 0
      },
      by_platform: (data.visibility?.platforms || data.aiVisibility || []).map(p => ({
        platform: p.name || p.platform || '',
        positive: Math.round((data.perception?.positive || 0)),
        neutral: Math.round((data.perception?.neutral || 0)),
        negative: Math.round((data.perception?.negative || 0))
      })),
      sample_quotes: [],
      insight: ''
    },
    topic_analysis: {
      clusters: (data.topics || []).map(t => ({
        cluster_name: t.name || t.topic || '',
        prompts_count: t.promptsCount || 0,
        total_mentions: t.count || 0,
        mention_rate: t.coOccurrenceRate || t.mentionRate || 0,
        mention_rate_denominator: '',
        avg_position: t.avgPosition || null,
        dominant_sentiment: t.dominantSentiment || 'neutral'
      })),
      insight: ''
    },
    citation_analysis: {
      total_unique_urls: data.citations?.length || 0,
      unique_urls: (data.citations || []).map(c => c.url || '').filter(url => url),
      domain_breakdown: buildDomainBreakdown(data.citations),
      brand_domain_citations: (data.citations || []).filter(c => c.isBrand).reduce((sum, c) => sum + (c.count || 1), 0),
      third_party_citations: (data.citations || []).filter(c => !c.isBrand).reduce((sum, c) => sum + (c.count || 1), 0),
      third_party_ratio: calculateThirdPartyRatio(data.citations),
      most_cited_pages: buildMostCitedPages(data.citations),
      insight: ''
    },
    prompts_with_snapshots: (data.prompts || data.snapshots || []).map(p => ({
      prompt_text: p.question || p.prompt_text || '',
      platform: p.platform || '',
      brand_mentioned: p.brand_mentioned || p.mentioned || false,
      position: p.position || null,
      has_citation: p.has_citation || p.hasCitation || false,
      cited_urls: p.cited_urls || p.urls || [],
      sentiment: p.sentiment || null,
      accuracy: p.accuracy || null,
      response_snapshot: p.answer?.substring(0, 300) || p.response_snapshot || '',
      full_response_length: p.answer?.length || p.response_snapshot?.length || 0
    })),
    improvement_suggestions: {
      total_gaps: data.suggestions?.length || 0,
      suggestions: (data.suggestions || []).map(s => ({
        gap_type: s.gap_type || s.gapType || 'missing_in_prompt',
        prompt_text: s.prompt_text || s.promptText || s.title || '',
        platform: s.platform || '',
        current_status: s.current_status || s.currentStatus || '',
        recommendation: s.recommendation || s.description || s.expectedEffect || '',
        priority: s.priority === 'P0' ? 'high' : (s.priority === 'P1' ? 'medium' : 'low')
      })),
      overall_summary: ''
    },
    competitor_brand_analysis: {
      competitors: (data.competitors || []).map(comp => ({
        name: comp.name || '',
        website: comp.website || '',
        visibility_score: comp.visibility_score || comp.marketShare || 0,
        total_mentions: comp.total_mentions || 0,
        mention_rate: comp.mention_rate || comp.aiMentionRate || 0,
        avg_position: comp.avg_position || null,
        positive_ratio: comp.positive_ratio || comp.sentimentRate || 0,
        share_of_voice: comp.share_of_voice || comp.marketShare || 0
      })),
      insight: ''
    },
    competitor_prompt_analysis: [],
    competitor_settings: {
      auto_discovered: false,
      competitor_list: (data.competitors || []).map(c => c.name),
      comparison_basis: 'same_prompts_and_platforms'
    },
    errors: data.errors || []
  };

  return geoData;
}

/**
 * 从引用数据构建域名统计
 * @param {Array} citations - 引用数据
 * @returns {Object} 域名统计
 */
function buildDomainBreakdown(citations) {
  const breakdown = {};
  if (!citations || !Array.isArray(citations)) {
    return breakdown;
  }

  for (const citation of citations) {
    const source = citation.source || citation.url || 'unknown';
    try {
      const url = new URL(source);
      const domain = url.hostname;
      breakdown[domain] = (breakdown[domain] || 0) + (citation.count || 1);
    } catch {
      breakdown[source] = (breakdown[source] || 0) + (citation.count || 1);
    }
  }

  return breakdown;
}

/**
 * 计算第三方引用占比
 * @param {Array} citations - 引用数据
 * @returns {number} 第三方占比
 */
function calculateThirdPartyRatio(citations) {
  if (!citations || !Array.isArray(citations) || citations.length === 0) {
    return 0;
  }

  const total = citations.reduce((sum, c) => sum + (c.count || 1), 0);
  const thirdParty = citations.filter(c => !c.isBrand).reduce((sum, c) => sum + (c.count || 1), 0);

  return total > 0 ? Math.round((thirdParty / total) * 100) : 0;
}

/**
 * 构建高频引用页面列表
 * @param {Array} citations - 引用数据
 * @returns {Array} 高频引用页面
 */
function buildMostCitedPages(citations) {
  if (!citations || !Array.isArray(citations)) {
    return [];
  }

  return citations
    .filter(c => c.url)
    .map(c => ({ url: c.url, count: c.count || 1 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

module.exports = {
  performAIAnalysis,
  performPromptAnalysis,
  generateArticle,
  aiChat,
  generateBrandPrompts,
  getPromptAnswer,
  getBatchPromptAnswers,
  transformToGeoFormat,
  PRESET_PROMPT_TEMPLATES,
  cleanThinkingTags,
  cleanJsonResponse
};
