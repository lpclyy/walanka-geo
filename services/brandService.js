/**
 * 品牌服务模块
 * @module services/brandService
 * @description 提供品牌相关的业务逻辑处理
 */

const database = require('../models/database');

// 内存缓存，用于存储已解析的品牌分析数据
// 结构: { brandId: { data: 解析后的数据, timestamp: 时间戳 } }
const analysisCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 缓存5分钟

/**
 * 从缓存获取分析数据
 * @param {number} brandId - 品牌ID
 * @returns {Object|null} 缓存的数据或null
 */
function getCachedAnalysis(brandId) {
  const cached = analysisCache.get(brandId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`[缓存命中] 品牌 ${brandId} 的分析数据`);
    return cached.data;
  }
  // 缓存过期或不存在，删除旧缓存
  if (cached) {
    analysisCache.delete(brandId);
  }
  return null;
}

/**
 * 将分析数据存入缓存
 * @param {number} brandId - 品牌ID
 * @param {Object} data - 分析数据
 */
function setCachedAnalysis(brandId, data) {
  analysisCache.set(brandId, {
    data,
    timestamp: Date.now()
  });
  console.log(`[缓存更新] 品牌 ${brandId} 的分析数据已缓存`);
}

/**
 * 清除品牌的缓存数据
 * @param {number} brandId - 品牌ID
 */
function clearAnalysisCache(brandId) {
  analysisCache.delete(brandId);
  console.log(`[缓存清除] 品牌 ${brandId} 的缓存已清除`);
}

/**
 * 清除所有缓存
 */
function clearAllCache() {
  analysisCache.clear();
  console.log('[缓存清除] 所有品牌分析缓存已清除');
}

/**
 * 创建新品牌
 * @param {Object} brandData - 品牌数据
 * @param {number} brandData.userId - 用户ID
 * @param {string} brandData.name - 品牌名称
 * @param {string} brandData.website - 品牌网站
 * @param {string} [brandData.description] - 品牌描述
 * @param {string} [brandData.industry] - 所属行业
 * @param {string} [brandData.positioning] - 市场定位
 * @returns {Promise<number>} 创建的品牌ID
 */
async function createBrand({ userId, name, website, description = '', industry = '', positioning = '' }) {
  const db = database.getDB();

  const [result] = await db.execute(
    'INSERT INTO brands (user_id, name, website, description, industry, positioning, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, name, website, description, industry, positioning, 'pending']
  );

  return result.insertId;
}

/**
 * 根据ID获取品牌详情
 * @param {number} brandId - 品牌ID
 * @returns {Promise<Object|null>} 品牌对象或null
 */
async function getBrandById(brandId) {
  const db = database.getDB();
  const [brands] = await db.execute('SELECT * FROM brands WHERE id = ?', [brandId]);
  return brands.length > 0 ? brands[0] : null;
}

/**
 * 根据用户ID获取品牌列表
 * @param {number} userId - 用户ID
 * @returns {Promise<Array>} 品牌列表
 */
async function getBrandsByUserId(userId) {
  const db = database.getDB();
  const [brands] = await db.execute(
    'SELECT id, name, website, industry, status, created_at FROM brands WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return brands;
}

/**
 * 更新品牌状态
 * @param {number} brandId - 品牌ID
 * @param {string} status - 新状态
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateBrandStatus(brandId, status) {
  const db = database.getDB();
  const [result] = await db.execute('UPDATE brands SET status = ? WHERE id = ?', [status, brandId]);
  return result.affectedRows > 0;
}

/**
 * 保存品牌分析结果
 * @param {number} brandId - 品牌ID
 * @param {Object} analysisData - 分析数据
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveAnalysisResult(brandId, analysisData) {
  const db = database.getDB();

  // 处理undefined值，转换为null或默认值
  const getValue = (value, defaultValue = {}) => {
    if (value === undefined) {
      return null; // 将undefined转换为null，用于SQL NULL
    }
    if (value === null) {
      return JSON.stringify(defaultValue);
    }
    return JSON.stringify(value);
  };

  // 兼容新的GEO模板结构
  // 新模板字段: data_overview, brand_overview, brand_visibility, brand_perception, topic_analysis, citation_analysis, prompts_with_snapshots, improvement_suggestions
  const overview = analysisData?.data_overview || analysisData?.brand_overview || analysisData?.overview || {};
  const visibility = analysisData?.brand_visibility || analysisData?.visibility || {};
  const perception = analysisData?.brand_perception || analysisData?.perception || {};
  const topics = analysisData?.topic_analysis || analysisData?.topics || {};
  const citations = analysisData?.citation_analysis || analysisData?.citations || {};
  const snapshots = analysisData?.prompts_with_snapshots || analysisData?.snapshots || [];
  const suggestions = analysisData?.improvement_suggestions || analysisData?.suggestions || {};
  const competition = analysisData?.competitor_brand_analysis || analysisData?.competition || {};

  const [result] = await db.execute(
    `INSERT INTO brand_analysis
    (brand_id, overview, visibility, perception, strengths, opportunities, competition, risks, topics, citations, snapshots, suggestions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      brandId,
      getValue(overview),
      getValue(visibility),
      getValue(perception),
      getValue(analysisData?.strengths, []),
      getValue(analysisData?.opportunities, []),
      getValue(competition),
      getValue(analysisData?.risks, []),
      getValue(topics),
      getValue(citations),
      getValue(snapshots),
      getValue(suggestions)
    ]
  );

  // 保存新数据后清除该品牌的缓存，确保下次读取的是最新数据
  clearAnalysisCache(brandId);
  console.log(`[保存] 品牌 ${brandId} 的分析结果已保存，缓存已清除`);

  // 保存关键指标到专门的指标表（用于快速查询）
  await saveBrandMetrics(brandId, result.insertId, analysisData);

  return result.insertId > 0;
}

/**
 * 计算美誉度得分（基于用户情感）
 * @param {Object} perceptionData - 品牌感知数据
 * @returns {Object} 美誉度指标
 */
function calculateReputationScore(perceptionData) {
  // 默认情感分布
  let positive = 0, neutral = 0, negative = 0;

  // 尝试从不同结构获取情感数据
  if (perceptionData?.sentiment_distribution) {
    // 新模板结构
    positive = perceptionData.sentiment_distribution.positive || 0;
    neutral = perceptionData.sentiment_distribution.neutral || 0;
    negative = perceptionData.sentiment_distribution.negative || 0;
  } else if (perceptionData?.positive !== undefined) {
    // 旧模板结构
    positive = perceptionData.positive || 0;
    neutral = perceptionData.neutral || 0;
    negative = perceptionData.negative || 0;
  } else if (perceptionData?.aggregate) {
    // 嵌套结构
    positive = perceptionData.aggregate.positive_ratio || perceptionData.aggregate.positive || 0;
    neutral = perceptionData.aggregate.neutral_ratio || perceptionData.aggregate.neutral || 0;
    negative = perceptionData.aggregate.negative_ratio || perceptionData.aggregate.negative || 0;
  }

  // 标准化为百分比（如果是小数）
  if (positive < 1 && positive > 0) positive = positive * 100;
  if (neutral < 1 && neutral > 0) neutral = neutral * 100;
  if (negative < 1 && negative > 0) negative = negative * 100;

  // 计算美誉度得分（正面情感权重最高）
  // 公式：正面*1.0 + 中性*0.5 + 负面*0.0
  let reputationScore = Math.round(positive * 1.0 + neutral * 0.5);
  if (reputationScore > 100) reputationScore = 100;

  return {
    reputationScore,
    positiveRatio: positive,
    neutralRatio: neutral,
    negativeRatio: negative
  };
}

/**
 * 保存品牌关键指标到指标表
 * @param {number} brandId - 品牌ID
 * @param {number} analysisId - 分析记录ID
 * @param {Object} analysisData - 分析数据
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveBrandMetrics(brandId, analysisId, analysisData) {
  try {
    const db = database.getDB();

    // 提取关键指标
    const overview = analysisData?.data_overview || analysisData?.brand_overview || analysisData?.overview || {};
    const visibility = analysisData?.brand_visibility || analysisData?.visibility || {};
    const perception = analysisData?.brand_perception || analysisData?.perception || {};

    // 计算美誉度
    const reputation = calculateReputationScore(perception);

    // 提取可见度指标
    const visibilityScore = visibility?.ai_visibility_score || visibility?.score || overview?.ai_visibility_score || overview?.overallScore || 0;
    const mentionRate = visibility?.visibility_rate || visibility?.mention_rate || overview?.overall_mention_rate || overview?.mentionRate || 0;
    const avgPosition = visibility?.avg_position || visibility?.average_position || overview?.overall_avg_position || 0;
    const shareOfVoice = visibility?.share_of_voice || visibility?.sov || overview?.share_of_voice || 0;

    // 提取数据概览
    const totalMentions = overview?.total_mentions || visibility?.total_mentions || 0;
    const totalQueries = overview?.total_queries || visibility?.total_queries || 0;
    const testedPlatforms = overview?.tested_platforms?.length || visibility?.by_platform?.length || 0;

    // 插入或更新指标记录
    await db.execute(
      `INSERT INTO brand_metrics 
       (brand_id, analysis_id, visibility_score, mention_rate, avg_position, share_of_voice,
        reputation_score, positive_sentiment_ratio, neutral_sentiment_ratio, negative_sentiment_ratio,
        total_mentions, total_queries, tested_platforms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       visibility_score = VALUES(visibility_score),
       mention_rate = VALUES(mention_rate),
       avg_position = VALUES(avg_position),
       share_of_voice = VALUES(share_of_voice),
       reputation_score = VALUES(reputation_score),
       positive_sentiment_ratio = VALUES(positive_sentiment_ratio),
       neutral_sentiment_ratio = VALUES(neutral_sentiment_ratio),
       negative_sentiment_ratio = VALUES(negative_sentiment_ratio),
       total_mentions = VALUES(total_mentions),
       total_queries = VALUES(total_queries),
       tested_platforms = VALUES(tested_platforms),
       updated_at = NOW()`,
      [
        brandId, analysisId, visibilityScore, mentionRate, avgPosition, shareOfVoice,
        reputation.reputationScore, reputation.positiveRatio, reputation.neutralRatio, reputation.negativeRatio,
        totalMentions, totalQueries, testedPlatforms
      ]
    );

    console.log(`[指标保存] 品牌 ${brandId} 的关键指标已保存，美誉度: ${reputation.reputationScore}`);
    return true;
  } catch (error) {
    console.error(`[指标保存] 品牌 ${brandId} 的关键指标保存失败:`, error);
    return false;
  }
}

/**
 * 从指标表获取品牌关键指标（快速查询）
 * @param {number} brandId - 品牌ID
 * @returns {Promise<Object|null>} 关键指标对象
 */
async function getBrandMetrics(brandId) {
  try {
    const db = database.getDB();
    const [metrics] = await db.execute(
      'SELECT * FROM brand_metrics WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1',
      [brandId]
    );

    if (metrics.length === 0) {
      return null;
    }

    const m = metrics[0];
    return {
      // 可见度指标
      visibilityScore: m.visibility_score,
      mentionRate: m.mention_rate,
      avgPosition: m.avg_position,
      shareOfVoice: m.share_of_voice,
      // 美誉度指标
      reputationScore: m.reputation_score,
      positiveSentimentRatio: m.positive_sentiment_ratio,
      neutralSentimentRatio: m.neutral_sentiment_ratio,
      negativeSentimentRatio: m.negative_sentiment_ratio,
      // 数据概览
      totalMentions: m.total_mentions,
      totalQueries: m.total_queries,
      testedPlatforms: m.tested_platforms,
      // 元数据
      createdAt: m.created_at,
      updatedAt: m.updated_at
    };
  } catch (error) {
    console.error(`[指标获取] 品牌 ${brandId} 的关键指标获取失败:`, error);
    return null;
  }
}

/**
 * 获取品牌分析结果
 * @param {number} brandId - 品牌ID
 * @returns {Promise<Object|null>} 分析结果或null
 */
/**
 * 安全解析JSON字符串
 * @param {string} jsonString - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析后的对象或默认值
 */
function safeJsonParse(jsonString, defaultValue = {}) {
  if (!jsonString || jsonString === 'null' || jsonString === 'undefined') {
    return defaultValue;
  }
  if (typeof jsonString === 'object') {
    return jsonString;
  }
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn('JSON解析失败:', e.message, '原始数据:', jsonString.substring(0, 100));
    return defaultValue;
  }
}

/**
 * 从数据库获取品牌分析结果（返回解析后的对象）
 * 支持缓存机制，避免重复解析JSON数据
 * @param {number} brandId - 品牌ID
 * @param {boolean} [useCache=true] - 是否使用缓存
 * @returns {Promise<Object|null>} 解析后的分析结果对象
 */
async function getAnalysisByBrandId(brandId, useCache = true) {
  // 1. 首先尝试从缓存获取
  if (useCache) {
    const cached = getCachedAnalysis(brandId);
    if (cached) {
      return cached;
    }
  }
  
  // 2. 从数据库查询
  const db = database.getDB();
  const [analysis] = await db.execute(
    'SELECT * FROM brand_analysis WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1', 
    [brandId]
  );
  
  if (analysis.length === 0) {
    console.log(`[数据库] 品牌 ${brandId} 无分析记录`);
    return null;
  }
  
  const result = analysis[0];
  
  // 3. 从指标表获取关键指标（快速查询）
  const metrics = await getBrandMetrics(brandId);

  // 4. 解析JSON数据（只解析一次）
  const parsedData = {
    // 新模板字段（前端期望的字段名）- 直接返回解析后的对象
    data_overview: safeJsonParse(result.overview, {}),
    brand_overview: safeJsonParse(result.overview, {}),
    brand_visibility: safeJsonParse(result.visibility, {}),
    brand_perception: safeJsonParse(result.perception, {}),
    topic_analysis: safeJsonParse(result.topics, {}),
    citation_analysis: safeJsonParse(result.citations, {}),
    prompts_with_snapshots: safeJsonParse(result.snapshots, []),
    improvement_suggestions: safeJsonParse(result.suggestions, {}),
    competitor_brand_analysis: safeJsonParse(result.competition, {}),
    // 保留原始字段以便兼容
    overview: safeJsonParse(result.overview, {}),
    visibility: safeJsonParse(result.visibility, {}),
    perception: safeJsonParse(result.perception, {}),
    topics: safeJsonParse(result.topics, {}),
    citations: safeJsonParse(result.citations, {}),
    snapshots: safeJsonParse(result.snapshots, []),
    suggestions: safeJsonParse(result.suggestions, {}),
    competition: safeJsonParse(result.competition, {}),
    strengths: safeJsonParse(result.strengths, []),
    opportunities: safeJsonParse(result.opportunities, []),
    risks: safeJsonParse(result.risks, []),
    // 关键指标（优先从指标表获取，如果没有则计算）
    _metrics: metrics || calculateMetricsFromAnalysis(safeJsonParse(result.visibility, {}), safeJsonParse(result.perception, {}), safeJsonParse(result.overview, {})),
    // 元数据
    _metadata: {
      id: result.id,
      brandId: result.brand_id,
      createdAt: result.created_at,
      cachedAt: new Date().toISOString()
    }
  };

  // 5. 存入缓存
  if (useCache) {
    setCachedAnalysis(brandId, parsedData);
  }

  console.log(`[数据库] 品牌 ${brandId} 的分析数据已从数据库加载并解析`);
  return parsedData;
}

/**
 * 从分析数据中计算关键指标（备用方案，当指标表无数据时使用）
 * @param {Object} visibility - 可见度数据
 * @param {Object} perception - 品牌感知数据
 * @param {Object} overview - 数据概览
 * @returns {Object} 计算后的关键指标
 */
function calculateMetricsFromAnalysis(visibility, perception, overview) {
  // 计算美誉度
  const reputation = calculateReputationScore(perception);

  return {
    // 可见度指标
    visibilityScore: visibility?.ai_visibility_score || visibility?.score || overview?.ai_visibility_score || overview?.overallScore || 0,
    mentionRate: visibility?.visibility_rate || visibility?.mention_rate || overview?.overall_mention_rate || overview?.mentionRate || 0,
    avgPosition: visibility?.avg_position || visibility?.average_position || overview?.overall_avg_position || 0,
    shareOfVoice: visibility?.share_of_voice || visibility?.sov || overview?.share_of_voice || 0,
    // 美誉度指标
    reputationScore: reputation.reputationScore,
    positiveSentimentRatio: reputation.positiveRatio,
    neutralSentimentRatio: reputation.neutralRatio,
    negativeSentimentRatio: reputation.negativeRatio,
    // 数据概览
    totalMentions: overview?.total_mentions || visibility?.total_mentions || 0,
    totalQueries: overview?.total_queries || visibility?.total_queries || 0,
    testedPlatforms: overview?.tested_platforms?.length || visibility?.by_platform?.length || 0,
    // 标记为计算所得
    _source: 'calculated'
  };
}

/**
 * 检查品牌是否有分析数据（仅检查，不解析）
 * @param {number} brandId - 品牌ID
 * @returns {Promise<boolean>} 是否存在分析数据
 */
async function hasAnalysisData(brandId) {
  const db = database.getDB();
  const [rows] = await db.execute(
    'SELECT 1 FROM brand_analysis WHERE brand_id = ? LIMIT 1', 
    [brandId]
  );
  return rows.length > 0;
}

/**
 * 获取品牌的提示词列表
 * @param {number} brandId - 品牌ID
 * @returns {Promise<Array>} 提示词列表
 */
async function getPromptListByBrandId(brandId) {
  const db = database.getDB();
  const [prompts] = await db.execute(
    'SELECT id, prompt_text, source, usage_count, effectiveness_score, created_at FROM brand_prompt_list WHERE brand_id = ? ORDER BY created_at DESC',
    [brandId]
  );
  return prompts;
}

/**
 * 添加提示词到品牌列表
 * @param {number} brandId - 品牌ID
 * @param {string} promptText - 提示词内容
 * @param {string} [source='custom'] - 来源
 * @returns {Promise<boolean>} 是否添加成功
 */
async function addPromptToList(brandId, promptText, source = 'custom') {
  const db = database.getDB();
  const [result] = await db.execute(
    'INSERT INTO brand_prompt_list (brand_id, prompt_text, source, usage_count, effectiveness_score) VALUES (?, ?, ?, ?, ?)',
    [brandId, promptText, source, 0, 4.0]
  );
  return result.insertId > 0;
}

/**
 * 从品牌列表删除提示词
 * @param {number} promptId - 提示词ID
 * @param {number} brandId - 品牌ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deletePromptFromList(promptId, brandId) {
  const db = database.getDB();
  const [result] = await db.execute('DELETE FROM brand_prompt_list WHERE id = ? AND brand_id = ?', [promptId, brandId]);
  return result.affectedRows > 0;
}

/**
 * 删除品牌及其相关数据
 * @param {number} brandId - 品牌ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteBrand(brandId) {
  const pool = database.getDB();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute('DELETE FROM brand_metrics WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brand_analysis WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brand_selected_prompts WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brand_prompt_suggestions WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brand_prompt_list WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brands WHERE id = ?', [brandId]);

    await connection.commit();
    
    // 清除该品牌的缓存
    clearAnalysisCache(brandId);
    
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取品牌状态信息
 * @param {Object} brand - 品牌对象
 * @returns {Object} 状态信息
 */
function getBrandStatusInfo(brand) {
  const statusMap = {
    pending: { progress: 0, message: '准备分析' },
    analyzing: { progress: 50, message: '正在分析' },
    completed: { progress: 100, message: '分析完成' },
    failed: { progress: 100, message: '分析失败' }
  };

  return statusMap[brand.status] || statusMap.pending;
}

module.exports = {
  createBrand,
  getBrandById,
  getBrandsByUserId,
  updateBrandStatus,
  saveAnalysisResult,
  getAnalysisByBrandId,
  hasAnalysisData,
  getPromptListByBrandId,
  addPromptToList,
  deletePromptFromList,
  deleteBrand,
  getBrandStatusInfo,
  // 缓存相关函数
  clearAnalysisCache,
  clearAllCache,
  // 关键指标相关函数
  getBrandMetrics,
  saveBrandMetrics,
  calculateReputationScore
};
