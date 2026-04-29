/**
 * GEO品牌分析报告解析器
 * @module geoParser
 * @description 用于解析AI返回的GEO品牌分析报告模板数据
 */

/**
 * 数据总览结构定义
 * @typedef {Object} DataOverview
 * @property {string} updateTime - 数据更新时间
 * @property {number} aiPlatformCount - 覆盖AI平台数
 * @property {number} queryCount - 执行查询总数
 * @property {number} brandMentionRate - 平均品牌提及率(%)
 * @property {number} positiveSentimentRate - 平均正面情感占比(%)
 * @property {number} officialCitationRate - 官网引用率(%)
 * @property {string} dataSourceNote - 数据来源说明
 */

/**
 * AI平台可见度数据结构
 * @typedef {Object} AIPlatformVisibility
 * @property {string} platform - AI平台名称
 * @property {number} mentionCount - 提及次数
 * @property {number} totalQueries - 查询总数
 * @property {number} mentionRate - 提及率(%)
 * @property {string} remark - 备注
 */

/**
 * 官方自我定位结构
 * @typedef {Object} OfficialPositioning
 * @property {string} source - 官网域名
 * @property {string} mission - 企业使命
 * @property {string} coreBusiness - 核心业务
 * @property {string} userScale - 用户规模
 * @property {string} brandUpgrade - 品牌升级
 */

/**
 * 高频关键词结构
 * @typedef {Object} HighFrequencyKeyword
 * @property {string} keyword - 关键词
 * @property {number} frequency - 出现频次
 */

/**
 * 搜索联想词结构
 * @typedef {Object} SearchAssociation
 * @property {string} type - 联想词类型
 * @property {string} example - 示例
 */

/**
 * 情感分布结构
 * @typedef {Object} SentimentDistribution
 * @property {number} positive - 正面占比(%)
 * @property {number} neutral - 中立占比(%)
 * @property {number} negative - 负面占比(%)
 * @property {string} positiveChange - 正面变化
 * @property {string} neutralChange - 中立变化
 * @property {string} negativeChange - 负面变化
 */

/**
 * 主题分析结构
 * @typedef {Object} TopicAnalysis
 * @property {number} rank - 排名
 * @property {string} topic - 主题
 * @property {number} coOccurrenceRate - 共现率(%)
 */

/**
 * 引用来源统计结构
 * @typedef {Object} CitationSource
 * @property {string} type - 来源类型
 * @property {number} percentage - 占比(%)
 * @property {string} representative - 代表来源
 */

/**
 * 提示词分析结构
 * @typedef {Object} PromptAnalysis
 * @property {string} queryType - 查询类型
 * @property {string} question - 问题
 * @property {string} summary - 响应摘要
 */

/**
 * 竞品分析结构
 * @typedef {Object} CompetitorAnalysis
 * @property {string} competitor - 竞品名称
 * @property {string} basis - 选择依据
 * @property {number} marketShare - 市场份额(%)
 * @property {number} sentimentRate - 情感正面率(%)
 * @property {number} aiMentionRate - AI提及率(%)
 * @property {number} officialCitationRate - 官方引用率(%)
 * @property {string} coreStrategy - 核心策略
 * @property {string} aiRelation - AI关联
 */

/**
 * 改进建议结构
 * @typedef {Object} ImprovementSuggestion
 * @property {string} action - 行动
 * @property {string} expectedEffect - 预期效果
 * @property {string} priority - 优先级(P0/P1/P2)
 */

/**
 * GEO报告完整数据结构
 * @typedef {Object} GEOReport
 * @property {string} brandName - 品牌名称
 * @property {string} officialWebsite - 官网URL
 * @property {DataOverview} overview - 数据总览
 * @property {AIPlatformVisibility[]} aiVisibility - AI平台可见度列表
 * @property {string} visibilityNote - AI可见度说明
 * @property {string} visibilityCoreFinding - 核心发现
 * @property {OfficialPositioning} officialPositioning - 官方自我定位
 * @property {HighFrequencyKeyword[]} keywords - 高频关键词列表
 * @property {string[]} perceptionDifferences - AI与传统品牌认知差异
 * @property {SearchAssociation[]} searchAssociations - 搜索联想词列表
 * @property {number} brandHomeShare - 品牌词首页占有率(%)
 * @property {number} serviceHomeShare - 品牌+服务首页占有率(%)
 * @property {number} competitionHomeShare - 品牌+竞争首页占有率(%)
 * @property {SentimentDistribution} sentimentDistribution - 情感分布
 * @property {Object} typicalKeywords - 各平台典型关键词
 * @property {string} positiveExample - 正面评价示例
 * @property {string[]} positiveSources - 正面评价来源
 * @property {string} negativeExample - 负面评价示例
 * @property {string[]} negativeSources - 负面评价来源
 * @property {TopicAnalysis[]} topics - 主题分析列表
 * @property {CitationSource[]} citationSources - 引用来源统计
 * @property {Object} citationHabits - 引用习惯对比
 * @property {PromptAnalysis[]} prompts - 提示词列表
 * @property {Object} answerSnapshot - 答案快照
 * @property {CompetitorAnalysis[]} competitors - 竞品分析列表
 * @property {ImprovementSuggestion[]} suggestions - 改进建议列表
 */

/**
 * 解析结果结构
 * @typedef {Object} ParseResult
 * @property {boolean} success - 解析是否成功
 * @property {GEOReport} data - 解析后的数据
 * @property {string[]} errors - 错误信息列表
 * @property {string[]} warnings - 警告信息列表
 */

/**
 * 验证并解析GEO报告数据
 * @param {string} rawText - AI返回的原始文本数据
 * @returns {ParseResult} 解析结果
 */
function parseGEOReport(rawText) {
  const result = {
    success: false,
    data: null,
    errors: [],
    warnings: []
  };

  try {
    // 验证文本非空
    if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
      result.errors.push('错误：输入文本为空');
      return result;
    }

    const report = {};
    const text = rawText.trim();

    // 1. 解析基本信息：品牌名称、官网
    report.brandName = extractValue(text, /品牌名称：([^\n]+)/);
    report.officialWebsite = extractValue(text, /官方网站：([^\n]+)/);

    // 2. 解析数据总览
    report.overview = parseDataOverview(text);

    // 3. 解析AI平台可见度
    const visibilityResult = parseAIPlatformVisibility(text);
    report.aiVisibility = visibilityResult.data;
    report.visibilityNote = extractValue(text, /⚠️ \*\*说明\*\*：([^\n]+)/);
    report.visibilityCoreFinding = extractValue(text, /\*\*核心发现\*\*：([^\n]+)/);

    // 4. 解析品牌概览
    report.officialPositioning = parseOfficialPositioning(text);
    report.keywords = parseKeywords(text);
    report.perceptionDifferences = parsePerceptionDifferences(text);

    // 5. 解析品牌可见度（搜索相关）
    report.searchAssociations = parseSearchAssociations(text);
    const shareResult = parseHomeShare(text);
    report.brandHomeShare = shareResult.brand;
    report.serviceHomeShare = shareResult.service;
    report.competitionHomeShare = shareResult.competition;

    // 6. 解析品牌感知（情感分析）
    report.sentimentDistribution = parseSentimentDistribution(text);
    report.typicalKeywords = parseTypicalKeywords(text);
    const sentimentExamples = parseSentimentExamples(text);
    report.positiveExample = sentimentExamples.positive;
    report.positiveSources = sentimentExamples.positiveSources;
    report.negativeExample = sentimentExamples.negative;
    report.negativeSources = sentimentExamples.negativeSources;

    // 7. 解析主题分析
    report.topics = parseTopics(text);

    // 8. 解析引用分析
    report.citationSources = parseCitationSources(text);
    report.citationHabits = parseCitationHabits(text);

    // 9. 解析提示词列表
    report.prompts = parsePrompts(text);

    // 10. 解析答案快照
    report.answerSnapshot = parseAnswerSnapshot(text);

    // 11. 解析竞品分析和改进建议
    report.competitors = parseCompetitors(text);
    report.suggestions = parseSuggestions(text);

    // 验证必要字段
    if (!report.brandName) {
      result.errors.push('错误：未能解析品牌名称');
    }

    result.data = report;
    result.success = result.errors.length === 0;

    return result;
  } catch (error) {
    result.errors.push(`解析过程发生异常：${error.message}`);
    return result;
  }
}

/**
 * 从文本中提取匹配的值
 * @param {string} text - 原始文本
 * @param {RegExp} regex - 匹配正则表达式
 * @param {string} defaultValue - 默认值
 * @returns {string} 提取的值
 */
function extractValue(text, regex, defaultValue = '') {
  const match = text.match(regex);
  return match ? match[1].trim() : defaultValue;
}

/**
 * 解析数据总览
 * @param {string} text - 原始文本
 * @returns {DataOverview} 数据总览对象
 */
function parseDataOverview(text) {
  const overviewSection = extractSection(text, '板块 1：数据总览', '板块 2：');
  
  return {
    updateTime: extractValue(overviewSection, /数据更新时间.*\| ([^\|]+)/),
    aiPlatformCount: parseInt(extractValue(overviewSection, /覆盖 AI 平台数.*\| (\d+)/)) || 0,
    queryCount: parseInt(extractValue(overviewSection, /执行查询总数.*\| (\d+)/)) || 0,
    brandMentionRate: parseFloat(extractValue(overviewSection, /平均品牌提及率.*\| ([\d.]+)%/)) || 0,
    positiveSentimentRate: parseFloat(extractValue(overviewSection, /平均正面情感占比.*\| ([\d.]+)%/)) || 0,
    officialCitationRate: parseFloat(extractValue(overviewSection, /官网引用率.*\| ([\d.]+)%/)) || 0,
    dataSourceNote: extractValue(overviewSection, /数据来源说明.*\| ([^\n]+)/)
  };
}

/**
 * 提取指定板块的内容
 * @param {string} text - 原始文本
 * @param {string} startMarker - 开始标记
 * @param {string} endMarker - 结束标记
 * @returns {string} 板块内容
 */
function extractSection(text, startMarker, endMarker) {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return '';
  
  const startContentIndex = text.indexOf('\n', startIndex) + 1;
  const endIndex = text.indexOf(endMarker, startContentIndex);
  
  if (endIndex === -1) {
    return text.substring(startContentIndex);
  }
  return text.substring(startContentIndex, endIndex);
}

/**
 * 解析AI平台可见度数据
 * @param {string} text - 原始文本
 * @returns {{data: AIPlatformVisibility[], errors: string[]}}
 */
function parseAIPlatformVisibility(text) {
  const section = extractSection(text, '板块 2：品牌 AI 可见度', '## 板块 3：');
  const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
  
  const data = [];
  const errors = [];
  
  // 跳过表头
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 4) {
      const mentionPart = parts[1]; // 格式如 "X/M"
      const [mentionCount, totalQueries] = mentionPart.split('/').map(v => parseInt(v) || 0);
      
      data.push({
        platform: parts[0],
        mentionCount,
        totalQueries,
        mentionRate: parseFloat(parts[2]) || 0,
        remark: parts[3] || ''
      });
    }
  }
  
  return { data, errors };
}

/**
 * 解析官方自我定位
 * @param {string} text - 原始文本
 * @returns {OfficialPositioning}
 */
function parseOfficialPositioning(text) {
  const section = extractSection(text, '### 3.1 官方自我定位', '### 3.2');
  
  return {
    source: extractValue(section, /来源：([^\n]+)/),
    mission: extractValue(section, /- 企业使命：([^\n]+)/),
    coreBusiness: extractValue(section, /- 核心业务：([^\n]+)/),
    userScale: extractValue(section, /- 用户规模：([^\n]+)/),
    brandUpgrade: extractValue(section, /- 品牌升级：([^\n]+)/)
  };
}

/**
 * 解析高频关键词
 * @param {string} text - 原始文本
 * @returns {HighFrequencyKeyword[]}
 */
function parseKeywords(text) {
  const section = extractSection(text, '### 3.2 AI 平台视角下的品牌', '### 3.3');
  const rows = section.match(/\| [^\|]+\| [^\|]+\|/g) || [];
  
  const keywords = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 2) {
      keywords.push({
        keyword: parts[0],
        frequency: parseInt(parts[1].replace('次', '')) || 0
      });
    }
  }
  
  return keywords;
}

/**
 * 解析品牌认知差异
 * @param {string} text - 原始文本
 * @returns {string[]}
 */
function parsePerceptionDifferences(text) {
  const section = extractSection(text, '### 3.3 AI 与传统品牌认知差异', '## 板块 4：');
  const matches = section.match(/\d+\.\s*([^\n]+)/g) || [];
  return matches.map(m => m.replace(/^\d+\.\s*/, '').trim());
}

/**
 * 解析搜索联想词
 * @param {string} text - 原始文本
 * @returns {SearchAssociation[]}
 */
function parseSearchAssociations(text) {
  const section = extractSection(text, '### 4.1 搜索联想词', '### 4.2');
  const rows = section.match(/\| [^\|]+\| [^\|]+\|/g) || [];
  
  const associations = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 2) {
      associations.push({
        type: parts[0],
        example: parts[1]
      });
    }
  }
  
  return associations;
}

/**
 * 解析首页占有率
 * @param {string} text - 原始文本
 * @returns {{brand: number, service: number, competition: number}}
 */
function parseHomeShare(text) {
  const section = extractSection(text, '### 4.2 搜索首页占有率', '## 板块 5：');
  
  return {
    brand: parseFloat(extractValue(section, /品牌词.*首页占有率：([\d.]+)%/)) || 0,
    service: parseFloat(extractValue(section, /.*\+服务.*相关词：([\d.]+)%/)) || 0,
    competition: parseFloat(extractValue(section, /.*\+竞争.*类词：([\d.]+)%/)) || 0
  };
}

/**
 * 解析情感分布
 * @param {string} text - 原始文本
 * @returns {SentimentDistribution}
 */
function parseSentimentDistribution(text) {
  const section = extractSection(text, '### 5.1 整体情感分布', '### 5.2');
  const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
  
  const distribution = {
    positive: 0,
    neutral: 0,
    negative: 0,
    positiveChange: '',
    neutralChange: '',
    negativeChange: ''
  };
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 3) {
      const type = parts[0];
      const percentage = parseFloat(parts[1].replace('%', '')) || 0;
      const change = parts[2];
      
      if (type.includes('正面')) {
        distribution.positive = percentage;
        distribution.positiveChange = change;
      } else if (type.includes('中立') || type.includes('混合')) {
        distribution.neutral = percentage;
        distribution.neutralChange = change;
      } else if (type.includes('负面')) {
        distribution.negative = percentage;
        distribution.negativeChange = change;
      }
    }
  }
  
  return distribution;
}

/**
 * 解析典型关键词
 * @param {string} text - 原始文本
 * @returns {Object}
 */
function parseTypicalKeywords(text) {
  const section = extractSection(text, '### 5.2 各平台典型关键词', '### 5.3');
  const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
  
  const keywords = {};
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 3) {
      keywords[parts[0]] = {
        positive: parts[1],
        negative: parts[2]
      };
    }
  }
  
  return keywords;
}

/**
 * 解析情感评价示例
 * @param {string} text - 原始文本
 * @returns {{positive: string, positiveSources: string[], negative: string, negativeSources: string[]}}
 */
function parseSentimentExamples(text) {
  const section = extractSection(text, '### 5.3 典型正面与负面评价', '## 板块 6：');
  
  const positiveSourceMatch = section.match(/正面代表.*来源：([^，,]+(?:，|,)[^，,]+)/);
  const positiveMatch = section.match(/正面代表[^>]*>\s*([^\n]+)/);
  const negativeSourceMatch = section.match(/负面代表.*来源：([^，,]+(?:，|,)[^，,]+)/);
  const negativeMatch = section.match(/负面代表[^>]*>\s*([^\n]+)/);
  
  return {
    positive: positiveMatch ? positiveMatch[1].trim() : '',
    positiveSources: positiveSourceMatch ? positiveSourceMatch[1].split(/，|,/).map(s => s.trim()) : [],
    negative: negativeMatch ? negativeMatch[1].trim() : '',
    negativeSources: negativeSourceMatch ? negativeSourceMatch[1].split(/，|,/).map(s => s.trim()) : []
  };
}

/**
 * 解析主题分析
 * @param {string} text - 原始文本
 * @returns {TopicAnalysis[]}
 */
function parseTopics(text) {
  const section = extractSection(text, '## 板块 6：主题分析', '## 板块 7：');
  const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
  
  const topics = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 3) {
      topics.push({
        rank: parseInt(parts[0]) || 0,
        topic: parts[1],
        coOccurrenceRate: parseFloat(parts[2].replace('%', '')) || 0
      });
    }
  }
  
  return topics;
}

/**
 * 解析引用来源
 * @param {string} text - 原始文本
 * @returns {CitationSource[]}
 */
function parseCitationSources(text) {
  const section = extractSection(text, '### 7.1 来源分类统计', '### 7.2');
  const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
  
  const sources = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 3) {
      sources.push({
        type: parts[0],
        percentage: parseFloat(parts[1].replace('%', '')) || 0,
        representative: parts[2]
      });
    }
  }
  
  return sources;
}

/**
 * 解析引用习惯对比
 * @param {string} text - 原始文本
 * @returns {Object}
 */
function parseCitationHabits(text) {
  const section = extractSection(text, '### 7.2 引用习惯对比', '## 板块 8：');
  const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
  
  const habits = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 3) {
      habits[parts[0]] = {
        preferredSource: parts[1],
        characteristics: parts[2]
      };
    }
  }
  
  return habits;
}

/**
 * 解析提示词列表
 * @param {string} text - 原始文本
 * @returns {PromptAnalysis[]}
 */
function parsePrompts(text) {
  const section = extractSection(text, '## 板块 8：提示词列表', '## 板块 9：');
  const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
  
  const prompts = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 3) {
      prompts.push({
        queryType: parts[0],
        question: parts[1],
        summary: parts[2]
      });
    }
  }
  
  return prompts;
}

/**
 * 解析答案快照
 * @param {string} text - 原始文本
 * @returns {Object}
 */
function parseAnswerSnapshot(text) {
  const section = extractSection(text, '## 板块 9：答案快照', '## 板块 10：');
  
  return {
    question: extractValue(section, /\*\*问题\*\*：「([^」]+)」/),
    source: extractValue(section, /\*\*来源\*\*：([^\n]+)/),
    excerpt: extractValue(section, /\*\*原文摘录\*\*：\s*>\s*([^\n]+)/)
  };
}

/**
 * 解析竞品分析
 * @param {string} text - 原始文本
 * @returns {CompetitorAnalysis[]}
 */
function parseCompetitors(text) {
  const section = extractSection(text, '### 10.1 竞品设置说明', '### 10.3');
  
  // 先从竞品设置说明获取竞品名称
  const rows = section.match(/\| [^\|]+\| [^\|]+\|/g) || [];
  const competitors = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 2) {
      competitors.push({
        competitor: parts[0],
        basis: parts[1],
        marketShare: 0,
        sentimentRate: 0,
        aiMentionRate: 0,
        officialCitationRate: 0,
        coreStrategy: '',
        aiRelation: ''
      });
    }
  }
  
  // 从竞品品牌分析表获取指标数据
  const analysisSection = extractSection(text, '### 10.2 竞品品牌分析表', '### 10.3');
  const analysisRows = analysisSection.match(/\| [^\|]+\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
  
  if (analysisRows.length > 1) {
    for (let i = 1; i < analysisRows.length; i++) {
      const row = analysisRows[i];
      const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
      
      if (parts.length >= 4) {
        const index = i - 1;
        if (index < competitors.length) {
          competitors[index].marketShare = parseFloat(parts[1].replace('%', '')) || 0;
          competitors[index].sentimentRate = parseFloat(parts[2].replace('%', '')) || 0;
          competitors[index].aiMentionRate = parseFloat(parts[3].replace('%', '')) || 0;
        }
      }
    }
  }
  
  // 从竞品提示词分析获取策略信息
  const promptSection = extractSection(text, '### 10.3 竞品提示词分析', '### 10.4');
  const competitorNames = competitors.map(c => c.competitor);
  
  competitorNames.forEach(name => {
    const regex = new RegExp(`\\*\\*${name}\\*\\*：[^-]+- 核心策略：([^\\n]+)[^-]+- AI 关联：([^\\n]+)`);
    const match = promptSection.match(regex);
    
    const competitor = competitors.find(c => c.competitor === name);
    if (competitor && match) {
      competitor.coreStrategy = match[1].trim();
      competitor.aiRelation = match[2].trim();
    }
  });
  
  return competitors;
}

/**
 * 解析改进建议
 * @param {string} text - 原始文本
 * @returns {ImprovementSuggestion[]}
 */
function parseSuggestions(text) {
  const section = extractSection(text, '### 10.4 SEO / GEO 改进建议', '');
  const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
  
  const suggestions = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length >= 3) {
      suggestions.push({
        action: parts[0],
        expectedEffect: parts[1],
        priority: parts[2]
      });
    }
  }
  
  return suggestions;
}

/**
 * 验证解析数据的完整性
 * @param {GEOReport} data - 解析后的数据
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
function validateReport(data) {
  const errors = [];
  const warnings = [];
  
  if (!data) {
    errors.push('数据对象为空');
    return { valid: false, errors, warnings };
  }
  
  // 验证必填字段
  if (!data.brandName) {
    errors.push('品牌名称不能为空');
  }
  
  if (!data.officialWebsite) {
    warnings.push('官网URL为空');
  }
  
  // 验证数值范围
  const checkPercentage = (value, fieldName) => {
    if (value < 0 || value > 100) {
      warnings.push(`${fieldName} 值 ${value}% 超出有效范围(0-100)`);
    }
  };
  
  if (data.overview) {
    checkPercentage(data.overview.brandMentionRate, '品牌提及率');
    checkPercentage(data.overview.positiveSentimentRate, '正面情感占比');
    checkPercentage(data.overview.officialCitationRate, '官网引用率');
  }
  
  if (data.sentimentDistribution) {
    const total = data.sentimentDistribution.positive + 
                  data.sentimentDistribution.neutral + 
                  data.sentimentDistribution.negative;
    if (Math.abs(total - 100) > 5) {
      warnings.push(`情感分布总和(${total}%)与100%偏差较大`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 获取数据填充到前端的映射配置
 * @returns {Object} 字段映射配置
 */
function getFieldMapping() {
  return {
    overview: {
      brandMentionRate: '#brandMentionRate',
      positiveSentimentRate: '#positiveSentimentRate',
      officialCitationRate: '#officialCitationRate',
      aiPlatformCount: '#aiPlatformCount',
      queryCount: '#queryCount',
      updateTime: '#updateTime'
    },
    aiVisibility: {
      container: '#aiVisibilityContainer',
      template: '<div class="platform-item"><span class="platform-name">{{platform}}</span><span class="mention-rate">{{mentionRate}}%</span></div>'
    },
    sentiment: {
      positive: '#sentimentPositive',
      neutral: '#sentimentNeutral',
      negative: '#sentimentNegative'
    },
    topics: {
      container: '#topicsContainer',
      maxItems: 5
    },
    competitors: {
      container: '#competitorsContainer'
    },
    suggestions: {
      container: '#suggestionsContainer',
      priorityColors: {
        'P0': '#ef4444',
        'P1': '#f59e0b',
        'P2': '#22c55e'
      }
    }
  };
}

/**
 * 将解析数据填充到DOM
 * @param {GEOReport} data - 解析数据
 * @param {Object} mapping - 字段映射配置
 */
function populateToDOM(data, mapping = getFieldMapping()) {
  // 填充数据总览
  if (data.overview) {
    const overviewMap = mapping.overview;
    Object.keys(overviewMap).forEach(key => {
      const selector = overviewMap[key];
      const element = document.querySelector(selector);
      if (element) {
        element.textContent = data.overview[key] !== undefined ? data.overview[key] : '--';
      }
    });
  }
  
  // 填充AI平台可见度
  if (data.aiVisibility && data.aiVisibility.length > 0) {
    const container = document.querySelector(mapping.aiVisibility.container);
    if (container) {
      container.innerHTML = data.aiVisibility.map(item => 
        mapping.aiVisibility.template
          .replace('{{platform}}', item.platform)
          .replace('{{mentionRate}}', item.mentionRate)
      ).join('');
    }
  }
  
  // 填充情感分布
  if (data.sentimentDistribution) {
    const sentimentMap = mapping.sentiment;
    const sentiment = data.sentimentDistribution;
    
    const positiveEl = document.querySelector(sentimentMap.positive);
    const neutralEl = document.querySelector(sentimentMap.neutral);
    const negativeEl = document.querySelector(sentimentMap.negative);
    
    if (positiveEl) {
      positiveEl.textContent = `${sentiment.positive}%`;
      positiveEl.style.width = `${sentiment.positive}%`;
    }
    if (neutralEl) {
      neutralEl.textContent = `${sentiment.neutral}%`;
      neutralEl.style.width = `${sentiment.neutral}%`;
    }
    if (negativeEl) {
      negativeEl.textContent = `${sentiment.negative}%`;
      negativeEl.style.width = `${sentiment.negative}%`;
    }
  }
  
  // 填充主题分析
  if (data.topics && data.topics.length > 0) {
    const container = document.querySelector(mapping.topics.container);
    if (container) {
      const items = data.topics.slice(0, mapping.topics.maxItems);
      container.innerHTML = items.map(item => 
        `<div class="topic-item">
          <span class="topic-rank">${item.rank}</span>
          <span class="topic-name">${item.topic}</span>
          <span class="topic-rate">${item.coOccurrenceRate}%</span>
        </div>`
      ).join('');
    }
  }
  
  // 填充改进建议
  if (data.suggestions && data.suggestions.length > 0) {
    const container = document.querySelector(mapping.suggestions.container);
    if (container) {
      container.innerHTML = data.suggestions.map(item => {
        const color = mapping.suggestions.priorityColors[item.priority] || '#666';
        return `
          <div class="suggestion-item">
            <span class="priority-badge" style="background: ${color}">${item.priority}</span>
            <div class="suggestion-content">
              <div class="suggestion-action">${item.action}</div>
              <div class="suggestion-effect">预期效果：${item.expectedEffect}</div>
            </div>
          </div>`;
      }).join('');
    }
  }
}

/**
 * 使用ECharts创建AI平台可见度图表
 * @param {string} containerId - 容器ID
 * @param {AIPlatformVisibility[]} data - AI平台数据
 */
function createAIPlatformChart(containerId, data) {
  if (!window.echarts) {
    console.error('ECharts未加载');
    return;
  }
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`容器 ${containerId} 不存在`);
    return;
  }
  
  const chart = window.echarts.init(container);
  
  const option = {
    title: {
      text: 'AI平台可见度分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['提及率'],
      bottom: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.platform),
      axisLabel: {
        rotate: 45,
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [{
      name: '提及率',
      type: 'bar',
      data: data.map(item => item.mentionRate),
      barWidth: '60%',
      itemStyle: {
        color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#0d9488' },
          { offset: 1, color: '#14b8a6' }
        ]),
        borderRadius: [4, 4, 0, 0]
      }
    }]
  };
  
  chart.setOption(option);
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.resize();
  });
  
  return chart;
}

/**
 * 使用ECharts创建情感分布饼图
 * @param {string} containerId - 容器ID
 * @param {SentimentDistribution} data - 情感分布数据
 */
function createSentimentChart(containerId, data) {
  if (!window.echarts) {
    console.error('ECharts未加载');
    return;
  }
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`容器 ${containerId} 不存在`);
    return;
  }
  
  const chart = window.echarts.init(container);
  
  const option = {
    title: {
      text: '情感分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}% ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [{
      name: '情感分布',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {c}%'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      data: [
        { value: data.positive, name: '正面', itemStyle: { color: '#22c55e' } },
        { value: data.neutral, name: '中立', itemStyle: { color: '#f59e0b' } },
        { value: data.negative, name: '负面', itemStyle: { color: '#ef4444' } }
      ]
    }]
  };
  
  chart.setOption(option);
  
  window.addEventListener('resize', () => {
    chart.resize();
  });
  
  return chart;
}

/**
 * 使用ECharts创建主题分析图表
 * @param {string} containerId - 容器ID
 * @param {TopicAnalysis[]} data - 主题分析数据
 */
function createTopicChart(containerId, data) {
  if (!window.echarts) {
    console.error('ECharts未加载');
    return;
  }
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`容器 ${containerId} 不存在`);
    return;
  }
  
  const chart = window.echarts.init(container);
  
  const option = {
    title: {
      text: '核心关联主题',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    yAxis: {
      type: 'category',
      data: data.map(item => item.topic).reverse()
    },
    series: [{
      name: '共现率',
      type: 'bar',
      data: data.map(item => item.coOccurrenceRate).reverse(),
      barWidth: '50%',
      itemStyle: {
        color: new window.echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#3b82f6' },
          { offset: 1, color: '#8b5cf6' }
        ]),
        borderRadius: [0, 4, 4, 0]
      }
    }]
  };
  
  chart.setOption(option);
  
  window.addEventListener('resize', () => {
    chart.resize();
  });
  
  return chart;
}

/**
 * 使用ECharts创建竞品对比图表
 * @param {string} containerId - 容器ID
 * @param {CompetitorAnalysis[]} data - 竞品分析数据
 * @param {string} brandName - 当前品牌名称
 */
function createCompetitorChart(containerId, data, brandName) {
  if (!window.echarts) {
    console.error('ECharts未加载');
    return;
  }
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`容器 ${containerId} 不存在`);
    return;
  }
  
  const chart = window.echarts.init(container);
  
  const option = {
    title: {
      text: '竞品对比分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#999'
        }
      }
    },
    legend: {
      data: ['市场份额', '情感正面率', 'AI提及率'],
      bottom: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: [brandName, ...data.map(item => item.competitor)],
        axisPointer: {
          type: 'shadow'
        }
      }
    ],
    yAxis: [
      {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      }
    ],
    series: [
      {
        name: '市场份额',
        type: 'bar',
        data: [0, ...data.map(item => item.marketShare)],
        itemStyle: {
          color: '#0d9488'
        }
      },
      {
        name: '情感正面率',
        type: 'bar',
        data: [0, ...data.map(item => item.sentimentRate)],
        itemStyle: {
          color: '#3b82f6'
        }
      },
      {
        name: 'AI提及率',
        type: 'bar',
        data: [0, ...data.map(item => item.aiMentionRate)],
        itemStyle: {
          color: '#f59e0b'
        }
      }
    ]
  };
  
  chart.setOption(option);
  
  window.addEventListener('resize', () => {
    chart.resize();
  });
  
  return chart;
}

module.exports = {
  parseGEOReport,
  validateReport,
  populateToDOM,
  getFieldMapping,
  createAIPlatformChart,
  createSentimentChart,
  createTopicChart,
  createCompetitorChart,
  // 导出辅助函数供外部使用
  extractValue,
  extractSection,
  // 导出类型定义
  types: {
    DataOverview: 'DataOverview',
    AIPlatformVisibility: 'AIPlatformVisibility',
    GEOReport: 'GEOReport'
  }
};
