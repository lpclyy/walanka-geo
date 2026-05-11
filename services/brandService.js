/**
 * 品牌服务模块
 * @module services/brandService
 * @description 提供品牌相关的业务逻辑处理
 */

const database = require('../models/database');

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

  return result.insertId > 0;
}

/**
 * 获取品牌分析结果
 * @param {number} brandId - 品牌ID
 * @returns {Promise<Object|null>} 分析结果或null
 */
async function getAnalysisByBrandId(brandId) {
  const db = database.getDB();
  const [analysis] = await db.execute('SELECT * FROM brand_analysis WHERE brand_id = ?', [brandId]);
  
  if (analysis.length === 0) return null;
  
  const result = analysis[0];
  
  // 返回原始数据（字符串形式），让前端根据需要解析
  // 这样可以避免重复解析导致的 "[object Object]" 错误
  return {
    data_overview: result.overview || '{}',
    brand_visibility: result.visibility || '{}',
    brand_perception: result.perception || '{}',
    topic_analysis: result.topics || '{}',
    citation_analysis: result.citations || '{}',
    prompts_with_snapshots: result.snapshots || '[]',
    improvement_suggestions: result.suggestions || '{}',
    competitor_brand_analysis: result.competition || '{}',
    // 保留原始字段以便兼容
    overview: result.overview || '{}',
    visibility: result.visibility || '{}',
    perception: result.perception || '{}',
    topics: result.topics || '{}',
    citations: result.citations || '{}',
    snapshots: result.snapshots || '[]',
    suggestions: result.suggestions || '{}',
    competition: result.competition || '{}',
    strengths: result.strengths || '[]',
    opportunities: result.opportunities || '[]',
    risks: result.risks || '[]'
  };
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

    await connection.execute('DELETE FROM brand_analysis WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brand_selected_prompts WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brand_prompt_suggestions WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brand_prompt_list WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brands WHERE id = ?', [brandId]);

    await connection.commit();
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
  getPromptListByBrandId,
  addPromptToList,
  deletePromptFromList,
  deleteBrand,
  getBrandStatusInfo
};
