/**
 * 分析服务模块
 * @module services/analysisService
 * @description 提供品牌分析指标体系和数据处理功能
 */

const { validatePercentage, validateInteger, validateFloat, formatNumber, formatPercentage } = require('../utils/dataValidator');

/**
 * 分析指标定义
 */
const ANALYSIS_METRICS = {
  // 数据总览指标
  overview: {
    aiPlatformCount: {
      name: '覆盖AI平台数',
      unit: '个',
      type: 'integer',
      min: 0,
      max: 100,
      description: '分析覆盖的AI平台数量'
    },
    queryCount: {
      name: '执行查询总数',
      unit: '次',
      type: 'integer',
      min: 0,
      max: 10000,
      description: '执行的查询请求总数'
    },
    brandMentionRate: {
      name: '平均品牌提及率',
      unit: '%',
      type: 'percentage',
      description: '品牌在各平台被提及的平均比例'
    },
    positiveSentimentRate: {
      name: '平均正面情感占比',
      unit: '%',
      type: 'percentage',
      description: '正面情感内容的平均占比'
    },
    officialCitationRate: {
      name: '官网引用率',
      unit: '%',
      type: 'percentage',
      description: '官方网站被引用的比例'
    },
    updateTime: {
      name: '数据更新时间',
      unit: '',
      type: 'datetime',
      description: '数据最后更新时间'
    }
  },

  // 品牌可见度指标
  visibility: {
    overallVisibility: {
      name: '综合可见度得分',
      unit: '分',
      type: 'integer',
      min: 0,
      max: 100,
      description: '品牌的综合可见度评分'
    },
    mentionCount: {
      name: '提及总次数',
      unit: '次',
      type: 'integer',
      min: 0,
      max: 10000,
      description: '品牌被提及的总次数'
    },
    weeklyChange: {
      name: '周变化率',
      unit: '%',
      type: 'float',
      description: '较上周的变化百分比'
    },
    industryRank: {
      name: '行业排名',
      unit: '',
      type: 'integer',
      min: 1,
      description: '在行业中的排名'
    }
  },

  // 品牌感知指标
  perception: {
    positive: {
      name: '正面情感占比',
      unit: '%',
      type: 'percentage',
      description: '正面情感内容占比'
    },
    neutral: {
      name: '中性情感占比',
      unit: '%',
      type: 'percentage',
      description: '中性情感内容占比'
    },
    negative: {
      name: '负面情感占比',
      unit: '%',
      type: 'percentage',
      description: '负面情感内容占比'
    },
    sentimentScore: {
      name: '情感得分',
      unit: '',
      type: 'float',
      min: -1,
      max: 1,
      decimals: 2,
      description: '综合情感得分(-1到1)'
    }
  },

  // 主题分析指标
  topics: {
    rank: {
      name: '排名',
      unit: '',
      type: 'integer',
      min: 1,
      max: 10,
      description: '主题排名'
    },
    topicName: {
      name: '主题名称',
      unit: '',
      type: 'string',
      description: '核心主题名称'
    },
    coOccurrenceRate: {
      name: '共现率',
      unit: '%',
      type: 'percentage',
      description: '与品牌共同出现的频率'
    },
    discussionCount: {
      name: '讨论热度',
      unit: '次',
      type: 'integer',
      min: 0,
      description: '讨论出现次数'
    }
  },

  // 引用分析指标
  citations: {
    sourceType: {
      name: '来源类型',
      unit: '',
      type: 'string',
      description: '引用来源的类型分类'
    },
    percentage: {
      name: '占比',
      unit: '%',
      type: 'percentage',
      description: '该类型来源的引用占比'
    },
    count: {
      name: '引用次数',
      unit: '次',
      type: 'integer',
      min: 0,
      description: '被引用的次数'
    },
    representative: {
      name: '代表来源',
      unit: '',
      type: 'string',
      description: '代表性的引用来源'
    }
  },

  // 竞品分析指标
  competition: {
    competitorName: {
      name: '竞品名称',
      unit: '',
      type: 'string',
      description: '竞品品牌名称'
    },
    marketShare: {
      name: '市场份额',
      unit: '%',
      type: 'percentage',
      description: '市场份额占比'
    },
    sentimentRate: {
      name: '情感正面率',
      unit: '%',
      type: 'percentage',
      description: '正面情感占比'
    },
    aiMentionRate: {
      name: 'AI提及率',
      unit: '%',
      type: 'percentage',
      description: 'AI平台提及率'
    },
    officialCitationRate: {
      name: '官方引用率',
      unit: '%',
      type: 'percentage',
      description: '官方网站被引用率'
    }
  },

  // 改进建议指标
  suggestions: {
    action: {
      name: '行动项',
      unit: '',
      type: 'string',
      description: '具体的改进行动'
    },
    expectedEffect: {
      name: '预期效果',
      unit: '%',
      type: 'percentage',
      description: '预期提升的百分比'
    },
    difficulty: {
      name: '实施难度',
      unit: '',
      type: 'integer',
      min: 1,
      max: 5,
      description: '实施难度评分(1-5)'
    },
    priority: {
      name: '优先级',
      unit: '',
      type: 'string',
      description: '优先级等级(P0/P1/P2)'
    }
  }
};

/**
 * 验证并标准化指标值
 * @param {string} metricType - 指标类型
 * @param {string} metricName - 指标名称
 * @param {*} value - 待验证的值
 * @returns {{valid: boolean, value: *, formatted: string, error: string}}
 */
function validateMetric(metricType, metricName, value) {
  const metric = ANALYSIS_METRICS[metricType]?.[metricName];
  if (!metric) {
    return { valid: false, value: null, formatted: '--', error: `未知指标: ${metricType}.${metricName}` };
  }

  let validation;
  
  switch (metric.type) {
    case 'integer':
      validation = validateInteger(value, {
        min: metric.min,
        max: metric.max,
        default: 0
      });
      break;
    case 'float':
      validation = validateFloat(value, {
        min: metric.min,
        max: metric.max,
        decimals: metric.decimals,
        default: 0
      });
      break;
    case 'percentage':
      validation = validatePercentage(value);
      break;
    case 'string':
      validation = { valid: true, value: String(value || '').trim(), error: '' };
      break;
    case 'datetime':
      validation = { valid: true, value: String(value || '').trim(), error: '' };
      break;
    default:
      validation = { valid: true, value: value, error: '' };
  }

  let formatted = '--';
  if (validation.valid && validation.value !== null && validation.value !== undefined && validation.value !== '') {
    if (metric.unit === '%') {
      formatted = formatPercentage(validation.value, metric.decimals);
    } else if (metric.type === 'integer') {
      formatted = formatNumber(validation.value, { suffix: metric.unit });
    } else if (metric.type === 'float') {
      formatted = formatNumber(validation.value, { decimals: metric.decimals, suffix: metric.unit });
    } else {
      formatted = String(validation.value);
    }
  }

  return {
    valid: validation.valid,
    value: validation.value,
    formatted,
    error: validation.error,
    unit: metric.unit,
    name: metric.name,
    description: metric.description
  };
}

/**
 * 计算综合得分
 * @param {Object} analysisData - 分析数据
 * @returns {number} 综合得分
 */
function calculateOverallScore(analysisData) {
  let totalScore = 0;
  let weightSum = 0;

  // 品牌可见度权重 30%
  if (analysisData.visibility?.overallVisibility !== undefined) {
    totalScore += analysisData.visibility.overallVisibility * 0.3;
    weightSum += 0.3;
  }

  // 正面情感占比权重 25%
  if (analysisData.perception?.positive !== undefined) {
    totalScore += analysisData.perception.positive * 0.25;
    weightSum += 0.25;
  }

  // 品牌提及率权重 20%
  if (analysisData.overview?.brandMentionRate !== undefined) {
    totalScore += analysisData.overview.brandMentionRate * 0.2;
    weightSum += 0.2;
  }

  // 官网引用率权重 15%
  if (analysisData.overview?.officialCitationRate !== undefined) {
    totalScore += analysisData.overview.officialCitationRate * 0.15;
    weightSum += 0.15;
  }

  // 主题丰富度权重 10%
  if (analysisData.topics?.length > 0) {
    const avgCoOccurrence = analysisData.topics.reduce((sum, t) => sum + (t.coOccurrenceRate || 0), 0) / analysisData.topics.length;
    totalScore += avgCoOccurrence * 0.1;
    weightSum += 0.1;
  }

  if (weightSum === 0) {
    return 0;
  }

  return Math.round(totalScore / weightSum);
}

/**
 * 计算趋势变化
 * @param {number} current - 当前值
 * @param {number} previous - 上一个值
 * @returns {{change: number, percentChange: number, trend: string}}
 */
function calculateTrend(current, previous) {
  if (!current || !previous) {
    return { change: 0, percentChange: 0, trend: 'stable' };
  }

  const change = current - previous;
  const percentChange = previous !== 0 ? ((change / previous) * 100) : 0;

  let trend = 'stable';
  if (percentChange > 5) trend = 'up';
  else if (percentChange < -5) trend = 'down';

  return {
    change: Math.round(change * 100) / 100,
    percentChange: Math.round(percentChange * 100) / 100,
    trend
  };
}

/**
 * 生成分析摘要
 * @param {Object} analysisData - 分析数据
 * @returns {string} 分析摘要
 */
function generateSummary(analysisData) {
  const summaryParts = [];
  
  if (analysisData.overview?.brandName) {
    summaryParts.push(`【${analysisData.overview.brandName}】`);
  }

  const overallScore = calculateOverallScore(analysisData);
  if (overallScore > 0) {
    summaryParts.push(`综合评分${overallScore}分`);
  }

  if (analysisData.visibility?.overallVisibility) {
    summaryParts.push(`可见度${analysisData.visibility.overallVisibility}分`);
  }

  if (analysisData.perception?.positive) {
    summaryParts.push(`正面情感${analysisData.perception.positive}%`);
  }

  if (analysisData.topics?.length > 0) {
    const topTopics = analysisData.topics.slice(0, 3).map(t => t.topic).join('、');
    summaryParts.push(`核心话题：${topTopics}`);
  }

  return summaryParts.join('，') || '暂无分析数据';
}

/**
 * 验证完整的分析数据集
 * @param {Object} analysisData - 分析数据
 * @returns {{valid: boolean, data: Object, errors: Array, warnings: Array}}
 */
function validateAnalysisData(analysisData) {
  const result = { valid: true, data: {}, errors: [], warnings: [] };

  // 验证数据总览
  if (analysisData.overview) {
    result.data.overview = {};
    const overviewMetrics = ['aiPlatformCount', 'queryCount', 'brandMentionRate', 'positiveSentimentRate', 'officialCitationRate', 'updateTime'];
    
    overviewMetrics.forEach(metric => {
      const validation = validateMetric('overview', metric, analysisData.overview[metric]);
      result.data.overview[metric] = validation.value;
      if (!validation.valid) {
        result.warnings.push(`数据总览.${metric}: ${validation.error}`);
      }
    });
  }

  // 验证品牌可见度
  if (analysisData.visibility) {
    result.data.visibility = {};
    const visibilityMetrics = ['overallVisibility', 'mentionCount', 'weeklyChange', 'industryRank'];
    
    visibilityMetrics.forEach(metric => {
      const validation = validateMetric('visibility', metric, analysisData.visibility[metric]);
      result.data.visibility[metric] = validation.value;
      if (!validation.valid) {
        result.warnings.push(`品牌可见度.${metric}: ${validation.error}`);
      }
    });

    // 验证平台数据
    if (analysisData.visibility.platforms && Array.isArray(analysisData.visibility.platforms)) {
      result.data.visibility.platforms = analysisData.visibility.platforms.map((platform, index) => {
        const nameValidation = validateMetric('topics', 'topicName', platform.name);
        const visibilityValidation = validateMetric('visibility', 'overallVisibility', platform.visibility);
        
        if (!nameValidation.valid) {
          result.warnings.push(`平台[${index}].name: ${nameValidation.error}`);
        }
        if (!visibilityValidation.valid) {
          result.warnings.push(`平台[${index}].visibility: ${visibilityValidation.error}`);
        }
        
        return {
          name: nameValidation.value,
          visibility: visibilityValidation.value
        };
      });
    }
  }

  // 验证品牌感知
  if (analysisData.perception) {
    result.data.perception = {};
    const perceptionMetrics = ['positive', 'neutral', 'negative', 'sentimentScore'];
    
    perceptionMetrics.forEach(metric => {
      const validation = validateMetric('perception', metric, analysisData.perception[metric]);
      result.data.perception[metric] = validation.value;
      if (!validation.valid) {
        result.warnings.push(`品牌感知.${metric}: ${validation.error}`);
      }
    });

    // 验证关键词
    if (analysisData.perception.keywords && Array.isArray(analysisData.perception.keywords)) {
      result.data.perception.keywords = analysisData.perception.keywords.slice(0, 10);
    }
  }

  // 验证主题分析
  if (analysisData.topics && Array.isArray(analysisData.topics)) {
    result.data.topics = analysisData.topics.slice(0, 10).map((topic, index) => {
      const rankValidation = validateMetric('topics', 'rank', topic.rank || index + 1);
      const nameValidation = validateMetric('topics', 'topicName', topic.name || topic.topic);
      const rateValidation = validateMetric('topics', 'coOccurrenceRate', topic.coOccurrenceRate);
      const countValidation = validateMetric('topics', 'discussionCount', topic.count);
      
      if (!nameValidation.valid) {
        result.warnings.push(`主题[${index}].name: ${nameValidation.error}`);
      }
      if (!rateValidation.valid) {
        result.warnings.push(`主题[${index}].coOccurrenceRate: ${rateValidation.error}`);
      }
      
      return {
        rank: rankValidation.value,
        topic: nameValidation.value,
        coOccurrenceRate: rateValidation.value,
        count: countValidation.value
      };
    });
  }

  // 验证引用分析
  if (analysisData.citations && Array.isArray(analysisData.citations)) {
    result.data.citations = analysisData.citations.slice(0, 10).map((citation, index) => {
      const typeValidation = validateMetric('citations', 'sourceType', citation.source);
      const countValidation = validateMetric('citations', 'count', citation.count);
      const percentValidation = validateMetric('citations', 'percentage', citation.percentage);
      
      return {
        source: typeValidation.value,
        count: countValidation.value,
        percentage: percentValidation.value,
        url: citation.url || ''
      };
    });
  }

  // 验证竞品分析
  if (analysisData.competition?.competitors && Array.isArray(analysisData.competition.competitors)) {
    result.data.competition = { competitors: [] };
    analysisData.competition.competitors.slice(0, 5).forEach((competitor, index) => {
      const nameValidation = validateMetric('competition', 'competitorName', competitor.name);
      const marketShareValidation = validateMetric('competition', 'marketShare', competitor.marketShare);
      const sentimentValidation = validateMetric('competition', 'sentimentRate', competitor.sentimentRate);
      const mentionValidation = validateMetric('competition', 'aiMentionRate', competitor.aiMentionRate);
      
      if (!nameValidation.valid) {
        result.warnings.push(`竞品[${index}].name: ${nameValidation.error}`);
      }
      
      result.data.competition.competitors.push({
        name: nameValidation.value,
        marketShare: marketShareValidation.value,
        sentimentRate: sentimentValidation.value,
        aiMentionRate: mentionValidation.value,
        strengths: competitor.strengths || '',
        weaknesses: competitor.weaknesses || ''
      });
    });
  }

  // 验证改进建议
  if (analysisData.suggestions && Array.isArray(analysisData.suggestions)) {
    result.data.suggestions = analysisData.suggestions.slice(0, 10).map((suggestion, index) => {
      const effectValidation = validateMetric('suggestions', 'expectedEffect', suggestion.expectedEffect);
      const difficultyValidation = validateMetric('suggestions', 'difficulty', suggestion.difficulty);
      
      const priorityMap = {
        'high': 'P0',
        'medium': 'P1',
        'low': 'P2',
        'P0': 'P0',
        'P1': 'P1',
        'P2': 'P2'
      };
      
      return {
        priority: priorityMap[suggestion.priority] || 'P1',
        title: suggestion.title || suggestion.action || '',
        description: suggestion.description || suggestion.action || '',
        expectedEffect: effectValidation.value,
        difficulty: difficultyValidation.value
      };
    });
  }

  // 计算综合得分
  result.data.overallScore = calculateOverallScore(result.data);
  result.data.summary = generateSummary(result.data);

  return result;
}

/**
 * 获取指标定义
 * @param {string} [metricType] - 指标类型（可选）
 * @returns {Object} 指标定义
 */
function getMetrics(metricType) {
  if (metricType) {
    return ANALYSIS_METRICS[metricType] || {};
  }
  return ANALYSIS_METRICS;
}

module.exports = {
  ANALYSIS_METRICS,
  validateMetric,
  calculateOverallScore,
  calculateTrend,
  generateSummary,
  validateAnalysisData,
  getMetrics
};
