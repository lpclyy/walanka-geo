const database = require('./database');

async function createBrand(userId, name, website, description = '', industry = '', positioning = '') {
  const db = database.getDB();
  
  const [result] = await db.execute(
    'INSERT INTO brands (user_id, name, website, description, industry, positioning, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, name, website, description, industry, positioning, 'pending']
  );
  
  return result.insertId;
}

async function getBrandById(brandId) {
  const db = database.getDB();
  
  const [brands] = await db.execute('SELECT * FROM brands WHERE id = ?', [brandId]);
  
  if (brands.length === 0) {
    return null;
  }
  
  return brands[0];
}

async function getBrandsByUserId(userId) {
  const db = database.getDB();
  
  const [brands] = await db.execute(
    'SELECT id, name, website, industry, status, created_at FROM brands WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  
  return brands;
}

async function updateBrandStatus(brandId, status) {
  const db = database.getDB();
  
  await db.execute('UPDATE brands SET status = ? WHERE id = ?', [status, brandId]);
}

async function savePromptSuggestions(brandId, suggestions) {
  const db = database.getDB();
  
  for (const suggestion of suggestions) {
    await db.execute(
      'INSERT INTO brand_prompt_suggestions (brand_id, prompt_text, category, is_selected) VALUES (?, ?, ?, ?)',
      [brandId, suggestion.text, suggestion.category, false]
    );
  }
}

async function getPromptSuggestionsByBrandId(brandId) {
  const db = database.getDB();
  
  const [suggestions] = await db.execute(
    'SELECT id, prompt_text, category FROM brand_prompt_suggestions WHERE brand_id = ?',
    [brandId]
  );
  
  return suggestions;
}

async function saveSelectedPrompts(brandId, selectedPromptIds, customPrompts) {
  const db = database.getDB();
  
  if (selectedPromptIds && selectedPromptIds.length > 0) {
    for (const promptId of selectedPromptIds) {
      const [suggestions] = await db.execute(
        'SELECT prompt_text FROM brand_prompt_suggestions WHERE id = ?',
        [promptId]
      );
      
      if (suggestions.length > 0) {
        await db.execute(
          'INSERT INTO brand_selected_prompts (brand_id, prompt_text, is_custom) VALUES (?, ?, ?)',
          [brandId, suggestions[0].prompt_text, false]
        );
        
        await db.execute(
          'INSERT INTO brand_prompt_list (brand_id, prompt_text, source, usage_count, effectiveness_score) VALUES (?, ?, ?, ?, ?)',
          [brandId, suggestions[0].prompt_text, 'system', 0, 4.5]
        );
      }
    }
  }
  
  if (customPrompts && customPrompts.length > 0) {
    for (const customPrompt of customPrompts) {
      await db.execute(
        'INSERT INTO brand_selected_prompts (brand_id, prompt_text, is_custom) VALUES (?, ?, ?)',
        [brandId, customPrompt, true]
      );
      
      await db.execute(
        'INSERT INTO brand_prompt_list (brand_id, prompt_text, source, usage_count, effectiveness_score) VALUES (?, ?, ?, ?, ?)',
        [brandId, customPrompt, 'custom', 0, 4.0]
      );
    }
  }
}

async function getSelectedPromptsByBrandId(brandId) {
  const db = database.getDB();
  
  const [prompts] = await db.execute(
    'SELECT prompt_text FROM brand_selected_prompts WHERE brand_id = ?',
    [brandId]
  );
  
  return prompts;
}

async function saveAnalysisResult(brandId, analysisData) {
  const db = database.getDB();
  
  await db.execute(
    'INSERT INTO brand_analysis (brand_id, overview, visibility, perception, strengths, opportunities, competition, risks, topics, citations, snapshots, suggestions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
}

async function getAnalysisByBrandId(brandId) {
  const db = database.getDB();
  
  const [analysis] = await db.execute('SELECT * FROM brand_analysis WHERE brand_id = ?', [brandId]);
  
  if (analysis.length === 0) {
    return null;
  }
  
  return analysis[0];
}

async function getPromptListByBrandId(brandId) {
  const db = database.getDB();
  
  const [prompts] = await db.execute(
    'SELECT id, prompt_text, source, usage_count, effectiveness_score, created_at FROM brand_prompt_list WHERE brand_id = ? ORDER BY created_at DESC',
    [brandId]
  );
  
  return prompts;
}

async function addPromptToList(brandId, promptText, source) {
  const db = database.getDB();
  
  await db.execute(
    'INSERT INTO brand_prompt_list (brand_id, prompt_text, source, usage_count, effectiveness_score) VALUES (?, ?, ?, ?, ?)',
    [brandId, promptText, source || 'custom', 0, 4.0]
  );
}

async function deletePromptFromList(promptId, brandId) {
  const db = database.getDB();
  
  await db.execute('DELETE FROM brand_prompt_list WHERE id = ? AND brand_id = ?', [promptId, brandId]);
}

async function deleteBrand(brandId) {
  const pool = database.getDB();
  const connection = await pool.getConnection();
  
  try {
    // 开始事务
    await connection.beginTransaction();
    
    // 删除品牌相关的所有数据
    await connection.execute('DELETE FROM brand_analysis WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brand_selected_prompts WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brand_prompt_suggestions WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brand_prompt_list WHERE brand_id = ?', [brandId]);
    await connection.execute('DELETE FROM brands WHERE id = ?', [brandId]);
    
    // 提交事务
    await connection.commit();
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    throw error;
  } finally {
    // 释放连接
    connection.release();
  }
}

module.exports = {
  createBrand,
  getBrandById,
  getBrandsByUserId,
  updateBrandStatus,
  savePromptSuggestions,
  getPromptSuggestionsByBrandId,
  saveSelectedPrompts,
  getSelectedPromptsByBrandId,
  saveAnalysisResult,
  getAnalysisByBrandId,
  getPromptListByBrandId,
  addPromptToList,
  deletePromptFromList,
  deleteBrand
};