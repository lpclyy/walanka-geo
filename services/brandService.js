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

  const [result] = await db.execute(
    `INSERT INTO brand_analysis
    (brand_id, overview, visibility, perception, strengths, opportunities, competition, risks, topics, citations, snapshots, suggestions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      brandId,
      JSON.stringify(analysisData.overview),
      JSON.stringify(analysisData.visibility),
      JSON.stringify(analysisData.perception),
      JSON.stringify(analysisData.strengths || []),
      JSON.stringify(analysisData.opportunities || []),
      JSON.stringify(analysisData.competition || {}),
      JSON.stringify(analysisData.risks || []),
      JSON.stringify(analysisData.topics),
      JSON.stringify(analysisData.citations),
      JSON.stringify(analysisData.snapshots),
      JSON.stringify(analysisData.suggestions)
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
  return analysis.length > 0 ? analysis[0] : null;
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
