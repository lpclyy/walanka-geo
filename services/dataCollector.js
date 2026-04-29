/**
 * 数据采集服务模块
 * @module services/dataCollector
 * @description 提供品牌数据采集和处理功能
 */

const axios = require('axios');
const { validateAnalysisData } = require('./analysisService');

/**
 * 数据采集配置
 */
const COLLECT_CONFIG = {
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000
};

/**
 * AI平台配置
 */
const AI_PLATFORMS = [
  { id: 'baidu', name: '百度文心一言', baseUrl: 'https://api.baidu.com' },
  { id: 'alibaba', name: '阿里通义千问', baseUrl: 'https://api.alibaba.com' },
  { id: 'tencent', name: '腾讯混元', baseUrl: 'https://api.tencent.com' },
  { id: 'doubao', name: '字节豆包', baseUrl: 'https://api.bytedance.com' },
  { id: 'kuaishou', name: '快手可灵', baseUrl: 'https://api.kuaishou.com' },
  { id: '360', name: '360智脑', baseUrl: 'https://api.360.cn' },
  { id: 'sensetime', name: '商汤日日新', baseUrl: 'https://api.sensetime.com' },
  { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimax.com' }
];

/**
 * 采集品牌数据
 * @param {Object} brandInfo - 品牌信息
 * @param {Object} [options] - 采集选项
 * @returns {Promise<Object>} 采集结果
 */
async function collectBrandData(brandInfo, options = {}) {
  const result = {
    success: false,
    data: null,
    errors: [],
    collectedFrom: [],
    totalQueries: 0
  };

  const { includePlatforms = AI_PLATFORMS.map(p => p.id) } = options;
  const activePlatforms = AI_PLATFORMS.filter(p => includePlatforms.includes(p.id));

  try {
    const collectedData = {
      overview: {
        brandName: brandInfo.name || '',
        officialWebsite: brandInfo.website || '',
        aiPlatformCount: 0,
        queryCount: 0,
        brandMentionRate: 0,
        positiveSentimentRate: 0,
        officialCitationRate: 0,
        updateTime: new Date().toISOString()
      },
      visibility: {
        overallVisibility: 0,
        mentionCount: 0,
        weeklyChange: 0,
        industryRank: null,
        platforms: []
      },
      perception: {
        positive: 0,
        neutral: 0,
        negative: 0,
        sentimentScore: 0,
        keywords: []
      },
      topics: [],
      citations: [],
      competition: { competitors: [] },
      strengths: [],
      opportunities: [],
      risks: [],
      snapshots: [],
      suggestions: []
    };

    let totalMentionRate = 0;
    let totalPositiveRate = 0;
    let totalVisibility = 0;
    let collectedPlatforms = 0;

    for (const platform of activePlatforms) {
      try {
        const platformData = await collectFromPlatform(platform, brandInfo);
        
        if (platformData) {
          collectedPlatforms++;
          result.collectedFrom.push(platform.id);
          result.totalQueries++;
          collectedData.queryCount++;

          // 聚合平台数据
          collectedData.visibility.platforms.push({
            name: platform.name,
            visibility: platformData.visibility || 0,
            mentions: platformData.mentions || 0
          });

          totalMentionRate += platformData.mentionRate || 0;
          totalPositiveRate += platformData.positiveRate || 0;
          totalVisibility += platformData.visibility || 0;

          // 合并关键词
          if (platformData.keywords && Array.isArray(platformData.keywords)) {
            platformData.keywords.forEach(k => {
              const existing = collectedData.perception.keywords.find(ex => ex.keyword === k.keyword);
              if (existing) {
                existing.frequency = (existing.frequency || 0) + (k.frequency || 1);
              } else {
                collectedData.perception.keywords.push(k);
              }
            });
          }

          // 合并引用来源
          if (platformData.citations && Array.isArray(platformData.citations)) {
            platformData.citations.forEach(c => {
              const existing = collectedData.citations.find(ex => ex.source === c.source);
              if (existing) {
                existing.count = (existing.count || 0) + (c.count || 1);
              } else {
                collectedData.citations.push(c);
              }
            });
          }
        }
      } catch (platformError) {
        result.errors.push(`平台 ${platform.name} 采集失败: ${platformError.message}`);
      }
    }

    // 计算平均值
    if (collectedPlatforms > 0) {
      collectedData.overview.aiPlatformCount = collectedPlatforms;
      collectedData.overview.brandMentionRate = Math.round((totalMentionRate / collectedPlatforms) * 100) / 100;
      collectedData.overview.positiveSentimentRate = Math.round((totalPositiveRate / collectedPlatforms) * 100) / 100;
      collectedData.visibility.overallVisibility = Math.round(totalVisibility / collectedPlatforms);
      collectedData.visibility.mentionCount = collectedData.visibility.platforms.reduce((sum, p) => sum + (p.mentions || 0), 0);
    }

    // 计算情感分布（基于关键词情感分析）
    const keywordCount = collectedData.perception.keywords.length;
    if (keywordCount > 0) {
      const positiveKeywords = collectedData.perception.keywords.filter(k => k.sentiment === 'positive').length;
      const negativeKeywords = collectedData.perception.keywords.filter(k => k.sentiment === 'negative').length;
      const neutralKeywords = keywordCount - positiveKeywords - negativeKeywords;

      collectedData.perception.positive = Math.round((positiveKeywords / keywordCount) * 100);
      collectedData.perception.neutral = Math.round((neutralKeywords / keywordCount) * 100);
      collectedData.perception.negative = Math.round((negativeKeywords / keywordCount) * 100);
      collectedData.perception.sentimentScore = ((positiveKeywords - negativeKeywords) / keywordCount);
    } else {
      collectedData.perception.positive = 0;
      collectedData.perception.neutral = 100;
      collectedData.perception.negative = 0;
      collectedData.perception.sentimentScore = 0;
    }

    // 排序关键词并限制数量
    collectedData.perception.keywords.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    collectedData.perception.keywords = collectedData.perception.keywords.slice(0, 20);

    // 计算引用占比
    const totalCitations = collectedData.citations.reduce((sum, c) => sum + (c.count || 0), 0);
    collectedData.citations.forEach(c => {
      c.percentage = totalCitations > 0 ? Math.round((c.count / totalCitations) * 100) : 0;
    });
    collectedData.citations.sort((a, b) => (b.count || 0) - (a.count || 0));
    collectedData.citations = collectedData.citations.slice(0, 10);

    // 验证并标准化数据
    const validation = validateAnalysisData(collectedData);
    
    if (validation.warnings.length > 0) {
      result.errors.push(...validation.warnings);
    }

    result.data = validation.data;
    result.success = true;

    return result;
  } catch (error) {
    result.errors.push(`数据采集失败: ${error.message}`);
    return result;
  }
}

/**
 * 从单个平台采集数据
 * @param {Object} platform - 平台配置
 * @param {Object} brandInfo - 品牌信息
 * @returns {Promise<Object|null>} 平台数据
 */
async function collectFromPlatform(platform, brandInfo) {
  // 模拟采集延迟
  await sleep(Math.random() * 2000 + 500);

  // 模拟不同平台的响应数据
  const mockData = generateMockPlatformData(platform, brandInfo);
  
  return mockData;
}

/**
 * 生成模拟平台数据
 * @param {Object} platform - 平台配置
 * @param {Object} brandInfo - 品牌信息
 * @returns {Object} 模拟数据
 */
function generateMockPlatformData(platform, brandInfo) {
  const brandName = brandInfo.name || '测试品牌';
  
  const visibility = Math.floor(Math.random() * 60) + 20;
  const mentionRate = Math.floor(Math.random() * 50) + 10;
  const positiveRate = Math.floor(Math.random() * 40) + 50;

  // 预定义的关键词池
  const keywords = [
    { keyword: brandName, frequency: Math.floor(Math.random() * 100) + 50, sentiment: 'positive' },
    { keyword: `${brandName} AI`, frequency: Math.floor(Math.random() * 50) + 20, sentiment: 'positive' },
    { keyword: `${brandName} 服务`, frequency: Math.floor(Math.random() * 30) + 10, sentiment: 'neutral' },
    { keyword: `${brandName} 产品`, frequency: Math.floor(Math.random() * 40) + 15, sentiment: 'positive' },
    { keyword: '人工智能', frequency: Math.floor(Math.random() * 20) + 5, sentiment: 'neutral' },
    { keyword: '技术', frequency: Math.floor(Math.random() * 15) + 3, sentiment: 'neutral' },
    { keyword: '解决方案', frequency: Math.floor(Math.random() * 10) + 2, sentiment: 'positive' },
    { keyword: '创新', frequency: Math.floor(Math.random() * 8) + 2, sentiment: 'positive' }
  ];

  // 预定义的引用来源
  const citations = [
    { source: '官方文档', count: Math.floor(Math.random() * 50) + 10, url: brandInfo.website },
    { source: '新闻媒体', count: Math.floor(Math.random() * 30) + 5 },
    { source: '行业报告', count: Math.floor(Math.random() * 20) + 3 },
    { source: '社交媒体', count: Math.floor(Math.random() * 40) + 8 },
    { source: '学术论文', count: Math.floor(Math.random() * 10) + 2 }
  ];

  return {
    platform: platform.id,
    platformName: platform.name,
    visibility,
    mentions: Math.floor(Math.random() * 1000) + 100,
    mentionRate,
    positiveRate,
    keywords: keywords.slice(0, Math.floor(Math.random() * 5) + 3),
    citations: citations.slice(0, Math.floor(Math.random() * 3) + 2),
    timestamp: new Date().toISOString()
  };
}

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取平台列表
 * @returns {Array} 平台列表
 */
function getPlatforms() {
  return AI_PLATFORMS;
}

/**
 * 批量采集多个品牌的数据
 * @param {Array} brandList - 品牌列表
 * @returns {Promise<Array>} 采集结果列表
 */
async function batchCollect(brandList) {
  const results = [];

  for (const brand of brandList) {
    const result = await collectBrandData(brand);
    results.push({ brandId: brand.id, ...result });
  }

  return results;
}

/**
 * 导出数据为CSV格式
 * @param {Object} data - 数据对象
 * @returns {string} CSV字符串
 */
function exportToCSV(data) {
  const headers = [
    '品牌名称', '覆盖平台数', '查询总数', '品牌提及率', '正面情感占比',
    '官网引用率', '综合评分', '数据更新时间'
  ];

  const rows = [[
    data.overview?.brandName || '',
    data.overview?.aiPlatformCount || 0,
    data.overview?.queryCount || 0,
    data.overview?.brandMentionRate || 0,
    data.overview?.positiveSentimentRate || 0,
    data.overview?.officialCitationRate || 0,
    data.overallScore || 0,
    data.overview?.updateTime || ''
  ]];

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * 导出数据为JSON格式
 * @param {Object} data - 数据对象
 * @returns {string} JSON字符串
 */
function exportToJSON(data) {
  return JSON.stringify(data, null, 2);
}

module.exports = {
  collectBrandData,
  collectFromPlatform,
  getPlatforms,
  batchCollect,
  exportToCSV,
  exportToJSON
};
