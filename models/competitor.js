const database = require('./database');

// 添加竞品品牌
async function createCompetitor(userId, brandId, name, website = '') {
  const db = database.getDB();
  
  const [result] = await db.execute(
    'INSERT INTO competitors (user_id, brand_id, name, website, status) VALUES (?, ?, ?, ?, ?)',
    [userId, brandId, name, website, 'pending']
  );
  
  return result.insertId;
}

// 根据ID获取竞品
async function getCompetitorById(competitorId) {
  const db = database.getDB();
  
  const [competitors] = await db.execute('SELECT * FROM competitors WHERE id = ?', [competitorId]);
  
  if (competitors.length === 0) {
    return null;
  }
  
  return competitors[0];
}

// 根据品牌ID获取竞品列表
async function getCompetitorsByBrandId(brandId) {
  const db = database.getDB();
  
  const [competitors] = await db.execute(
    'SELECT * FROM competitors WHERE brand_id = ? ORDER BY created_at DESC',
    [brandId]
  );
  
  return competitors;
}

// 更新竞品分析数据
async function updateCompetitorAnalysis(competitorId, analysisData) {
  const db = database.getDB();
  
  await db.execute(
    'UPDATE competitors SET visibility_score = ?, total_mentions = ?, mention_rate = ?, avg_position = ?, positive_ratio = ?, share_of_voice = ?, status = ? WHERE id = ?',
    [
      analysisData.visibility_score || 0,
      analysisData.total_mentions || 0,
      analysisData.mention_rate || 0,
      analysisData.avg_position || 0,
      analysisData.positive_ratio || 0,
      analysisData.share_of_voice || 0,
      'analyzed',
      competitorId
    ]
  );
}

// 删除竞品
async function deleteCompetitor(competitorId) {
  const db = database.getDB();
  
  await db.execute('DELETE FROM competitors WHERE id = ?', [competitorId]);
}

// 更新竞品基本信息
async function updateCompetitor(competitorId, name, website) {
  const db = database.getDB();
  
  await db.execute(
    'UPDATE competitors SET name = ?, website = ? WHERE id = ?',
    [name, website, competitorId]
  );
}

module.exports = {
  createCompetitor,
  getCompetitorById,
  getCompetitorsByBrandId,
  updateCompetitorAnalysis,
  deleteCompetitor,
  updateCompetitor
};