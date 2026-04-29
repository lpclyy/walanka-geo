/**
 * 用户品牌服务模块
 * @module services/userBrandService
 * @description 提供用户级别的品牌管理和数据隔离功能
 */

const database = require('../models/database');

/**
 * 创建用户品牌配置
 * @param {Object} configData - 品牌配置数据
 * @param {number} configData.userId - 用户ID
 * @param {string} configData.brandName - 品牌名称
 * @param {string} configData.website - 品牌网站
 * @param {string} [configData.description] - 品牌描述
 * @param {string} [configData.industry] - 所属行业
 * @param {string} [configData.positioning] - 市场定位
 * @param {string} [configData.logoUrl] - Logo URL
 * @returns {Promise<Object>} 创建的品牌对象
 */
async function createUserBrand(configData) {
  const { userId, brandName, website, description = '', industry = '', positioning = '', logoUrl = '' } = configData;
  
  const db = database.getDB();
  
  const [result] = await db.execute(
    'INSERT INTO brands (user_id, name, website, description, industry, positioning, logo_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
    [userId, brandName, website, description, industry, positioning, logoUrl, 'pending']
  );
  
  const brandId = result.insertId;
  
  // 创建默认的品牌配置
  await createBrandSettings(brandId);
  
  return {
    id: brandId,
    userId,
    name: brandName,
    website,
    description,
    industry,
    positioning,
    logoUrl,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

/**
 * 创建品牌设置
 * @param {number} brandId - 品牌ID
 * @returns {Promise<void>}
 */
async function createBrandSettings(brandId) {
  const db = database.getDB();
  
  await db.execute(
    'INSERT INTO brand_settings (brand_id, settings) VALUES (?, ?)',
    [brandId, JSON.stringify({
      analysisFrequency: 'weekly',
      notificationEnabled: true,
      defaultView: 'overview',
      chartType: 'bar',
      dataRetentionDays: 30,
      autoRefresh: true,
      refreshInterval: 60
    })]
  );
}

/**
 * 获取用户的品牌列表
 * @param {number} userId - 用户ID
 * @returns {Promise<Array>} 用户的品牌列表
 */
async function getUserBrands(userId) {
  const db = database.getDB();
  
  const [brands] = await db.execute(
    `SELECT b.id, b.name, b.website, b.description, b.industry, b.positioning, 
            b.logo_url as logoUrl, b.status, b.created_at as createdAt,
            (SELECT COUNT(*) FROM brand_analysis ba WHERE ba.brand_id = b.id) as analysisCount,
            (SELECT MAX(created_at) FROM brand_analysis ba WHERE ba.brand_id = b.id) as lastAnalysisAt
     FROM brands b 
     WHERE b.user_id = ? 
     ORDER BY b.created_at DESC`,
    [userId]
  );
  
  return brands.map(brand => ({
    ...brand,
    lastAnalysisAt: brand.lastAnalysisAt || null,
    analysisCount: brand.analysisCount || 0
  }));
}

/**
 * 获取用户的活跃品牌
 * @param {number} userId - 用户ID
 * @returns {Promise<Object|null>} 活跃品牌对象
 */
async function getActiveBrand(userId) {
  const db = database.getDB();
  
  const [brands] = await db.execute(
    'SELECT * FROM brands WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
    [userId, 'completed']
  );
  
  return brands.length > 0 ? brands[0] : null;
}

/**
 * 设置活跃品牌
 * @param {number} userId - 用户ID
 * @param {number} brandId - 品牌ID
 * @returns {Promise<boolean>} 是否设置成功
 */
async function setActiveBrand(userId, brandId) {
  const db = database.getDB();
  
  // 验证品牌属于该用户
  const [brands] = await db.execute(
    'SELECT * FROM brands WHERE id = ? AND user_id = ?',
    [brandId, userId]
  );
  
  if (brands.length === 0) {
    throw new Error('品牌不存在或不属于当前用户');
  }
  
  // 更新用户的活跃品牌设置
  await db.execute(
    'INSERT INTO user_settings (user_id, key_name, key_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE key_value = ?',
    [userId, 'active_brand', brandId.toString(), brandId.toString()]
  );
  
  return true;
}

/**
 * 获取品牌详情（带权限验证）
 * @param {number} userId - 用户ID
 * @param {number} brandId - 品牌ID
 * @returns {Promise<Object|null>} 品牌详情
 */
async function getBrandWithPermission(userId, brandId) {
  const db = database.getDB();
  
  const [brands] = await db.execute(
    `SELECT b.id, b.name, b.website, b.description, b.industry, b.positioning, 
            b.logo_url as logoUrl, b.status, b.created_at as createdAt,
            bs.settings
     FROM brands b
     LEFT JOIN brand_settings bs ON b.id = bs.brand_id
     WHERE b.id = ? AND b.user_id = ?`,
    [brandId, userId]
  );
  
  if (brands.length === 0) {
    return null;
  }
  
  const brand = brands[0];
  brand.settings = brand.settings ? JSON.parse(brand.settings) : {};
  
  return brand;
}

/**
 * 更新品牌信息
 * @param {number} userId - 用户ID
 * @param {number} brandId - 品牌ID
 * @param {Object} updateData - 更新数据
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateUserBrand(userId, brandId, updateData) {
  const db = database.getDB();
  
  // 验证品牌属于该用户
  const [brands] = await db.execute(
    'SELECT * FROM brands WHERE id = ? AND user_id = ?',
    [brandId, userId]
  );
  
  if (brands.length === 0) {
    throw new Error('品牌不存在或不属于当前用户');
  }
  
  const fields = [];
  const values = [];
  
  if (updateData.name !== undefined) {
    fields.push('name = ?');
    values.push(updateData.name);
  }
  
  if (updateData.website !== undefined) {
    fields.push('website = ?');
    values.push(updateData.website);
  }
  
  if (updateData.description !== undefined) {
    fields.push('description = ?');
    values.push(updateData.description);
  }
  
  if (updateData.industry !== undefined) {
    fields.push('industry = ?');
    values.push(updateData.industry);
  }
  
  if (updateData.positioning !== undefined) {
    fields.push('positioning = ?');
    values.push(updateData.positioning);
  }
  
  if (updateData.logoUrl !== undefined) {
    fields.push('logo_url = ?');
    values.push(updateData.logoUrl);
  }
  
  if (fields.length === 0) {
    return false;
  }
  
  values.push(brandId);
  
  await db.execute(
    `UPDATE brands SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  return true;
}

/**
 * 更新品牌设置
 * @param {number} userId - 用户ID
 * @param {number} brandId - 品牌ID
 * @param {Object} settings - 设置对象
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateBrandSettings(userId, brandId, settings) {
  const db = database.getDB();
  
  // 验证品牌属于该用户
  const [brands] = await db.execute(
    'SELECT * FROM brands WHERE id = ? AND user_id = ?',
    [brandId, userId]
  );
  
  if (brands.length === 0) {
    throw new Error('品牌不存在或不属于当前用户');
  }
  
  await db.execute(
    'UPDATE brand_settings SET settings = ? WHERE brand_id = ?',
    [JSON.stringify(settings), brandId]
  );
  
  return true;
}

/**
 * 删除用户品牌
 * @param {number} userId - 用户ID
 * @param {number} brandId - 品牌ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteUserBrand(userId, brandId) {
  const pool = database.getDB();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 验证品牌属于该用户
    const [brands] = await connection.execute(
      'SELECT * FROM brands WHERE id = ? AND user_id = ?',
      [brandId, userId]
    );
    
    if (brands.length === 0) {
      throw new Error('品牌不存在或不属于当前用户');
    }
    
    // 删除品牌相关的所有数据
    await connection.execute('DELETE FROM brand_settings WHERE brand_id = ?', [brandId]);
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
 * 获取用户的品牌分析数据（数据隔离）
 * @param {number} userId - 用户ID
 * @param {number} brandId - 品牌ID
 * @returns {Promise<Object|null>} 分析数据
 */
async function getBrandAnalysis(userId, brandId) {
  const db = database.getDB();
  
  // 验证品牌属于该用户
  const [brands] = await db.execute(
    'SELECT * FROM brands WHERE id = ? AND user_id = ?',
    [brandId, userId]
  );
  
  if (brands.length === 0) {
    throw new Error('品牌不存在或不属于当前用户');
  }
  
  const [analysis] = await db.execute(
    'SELECT * FROM brand_analysis WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1',
    [brandId]
  );
  
  if (analysis.length === 0) {
    return null;
  }
  
  const result = analysis[0];
  
  // 解析JSON字段
  const jsonFields = ['overview', 'visibility', 'perception', 'strengths', 'opportunities', 
                      'competition', 'risks', 'topics', 'citations', 'snapshots', 'suggestions'];
  
  jsonFields.forEach(field => {
    if (result[field]) {
      try {
        result[field] = JSON.parse(result[field]);
      } catch {
        result[field] = {};
      }
    }
  });
  
  return result;
}

/**
 * 保存品牌分析结果（带权限验证）
 * @param {number} userId - 用户ID
 * @param {number} brandId - 品牌ID
 * @param {Object} analysisData - 分析数据
 * @returns {Promise<number>} 分析记录ID
 */
async function saveBrandAnalysis(userId, brandId, analysisData) {
  const db = database.getDB();
  
  // 验证品牌属于该用户
  const [brands] = await db.execute(
    'SELECT * FROM brands WHERE id = ? AND user_id = ?',
    [brandId, userId]
  );
  
  if (brands.length === 0) {
    throw new Error('品牌不存在或不属于当前用户');
  }
  
  const [result] = await db.execute(
    `INSERT INTO brand_analysis 
     (brand_id, overview, visibility, perception, strengths, opportunities, 
      competition, risks, topics, citations, snapshots, suggestions, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      brandId,
      JSON.stringify(analysisData.overview || {}),
      JSON.stringify(analysisData.visibility || {}),
      JSON.stringify(analysisData.perception || {}),
      JSON.stringify(analysisData.strengths || []),
      JSON.stringify(analysisData.opportunities || []),
      JSON.stringify(analysisData.competition || {}),
      JSON.stringify(analysisData.risks || []),
      JSON.stringify(analysisData.topics || []),
      JSON.stringify(analysisData.citations || []),
      JSON.stringify(analysisData.snapshots || []),
      JSON.stringify(analysisData.suggestions || [])
    ]
  );
  
  // 更新品牌状态为已完成
  await db.execute('UPDATE brands SET status = ? WHERE id = ?', ['completed', brandId]);
  
  return result.insertId;
}

/**
 * 获取用户的品牌分析历史
 * @param {number} userId - 用户ID
 * @param {number} brandId - 品牌ID
 * @param {number} [limit=10] - 返回数量限制
 * @returns {Promise<Array>} 分析历史列表
 */
async function getBrandAnalysisHistory(userId, brandId, limit = 10) {
  const db = database.getDB();
  
  // 验证品牌属于该用户
  const [brands] = await db.execute(
    'SELECT * FROM brands WHERE id = ? AND user_id = ?',
    [brandId, userId]
  );
  
  if (brands.length === 0) {
    throw new Error('品牌不存在或不属于当前用户');
  }
  
  const [history] = await db.execute(
    'SELECT id, created_at as createdAt FROM brand_analysis WHERE brand_id = ? ORDER BY created_at DESC LIMIT ?',
    [brandId, limit]
  );
  
  return history;
}

/**
 * 获取用户的分析统计数据
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 统计数据
 */
async function getUserAnalysisStats(userId) {
  const db = database.getDB();
  
  const [brandStats] = await db.execute(
    `SELECT 
      COUNT(DISTINCT b.id) as totalBrands,
      COUNT(DISTINCT ba.id) as totalAnalyses,
      MAX(ba.created_at) as lastAnalysisAt
     FROM brands b
     LEFT JOIN brand_analysis ba ON b.id = ba.brand_id
     WHERE b.user_id = ?`,
    [userId]
  );
  
  const stats = brandStats[0];
  
  return {
    totalBrands: stats.totalBrands || 0,
    totalAnalyses: stats.totalAnalyses || 0,
    lastAnalysisAt: stats.lastAnalysisAt || null
  };
}

/**
 * 检查用户是否有权限访问品牌
 * @param {number} userId - 用户ID
 * @param {number} brandId - 品牌ID
 * @returns {Promise<boolean>} 是否有权限
 */
async function checkBrandPermission(userId, brandId) {
  const db = database.getDB();
  
  const [brands] = await db.execute(
    'SELECT id FROM brands WHERE id = ? AND user_id = ?',
    [brandId, userId]
  );
  
  return brands.length > 0;
}

module.exports = {
  createUserBrand,
  getUserBrands,
  getActiveBrand,
  setActiveBrand,
  getBrandWithPermission,
  updateUserBrand,
  updateBrandSettings,
  deleteUserBrand,
  getBrandAnalysis,
  saveBrandAnalysis,
  getBrandAnalysisHistory,
  getUserAnalysisStats,
  checkBrandPermission
};
