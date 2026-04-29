/**
 * 文章服务模块
 * @module services/articleService
 * @description 提供文章相关的业务逻辑处理
 */

const database = require('../models/database');
const { formatDate } = require('../utils/datetime');

/**
 * 获取所有文章列表
 * @param {string} [category] - 分类筛选
 * @returns {Promise<Array>} 文章列表
 */
async function getAllArticles(category = null) {
  const db = database.getDB();

  let query = 'SELECT id, title, author, category, DATE_FORMAT(created_at, "%Y/%m/%d") as date FROM articles';
  let params = [];

  if (category && category !== 'all') {
    query += ' WHERE category = ?';
    params.push(category);
  }

  query += ' ORDER BY created_at DESC';

  const [articles] = await db.execute(query, params);
  return articles;
}

/**
 * 根据ID获取文章详情
 * @param {number} id - 文章ID
 * @returns {Promise<Object|null>} 文章对象或null
 */
async function getArticleById(id) {
  const db = database.getDB();
  const [articles] = await db.execute('SELECT * FROM articles WHERE id = ?', [id]);
  return articles.length > 0 ? articles[0] : null;
}

/**
 * 根据分类获取文章列表
 * @param {string} category - 分类名称
 * @returns {Promise<Array>} 文章列表
 */
async function getArticlesByCategory(category) {
  const db = database.getDB();
  const [articles] = await db.execute(
    'SELECT id, title, author, category, views, DATE_FORMAT(created_at, "%Y/%m/%d") as date FROM articles WHERE category = ? ORDER BY created_at DESC',
    [category]
  );
  return articles;
}

/**
 * 创建新文章
 * @param {Object} articleData - 文章数据
 * @param {string} articleData.title - 文章标题
 * @param {string} articleData.author - 作者
 * @param {string} articleData.content - 内容
 * @param {string} articleData.category - 分类
 * @returns {Promise<Object>} 创建的文章信息
 */
async function createArticle({ title, author, content, category }) {
  const db = database.getDB();

  const [result] = await db.execute(
    'INSERT INTO articles (title, author, content, category) VALUES (?, ?, ?, ?)',
    [title, author, content, category]
  );

  return {
    id: result.insertId,
    title,
    author,
    content,
    category,
    date: formatDate(new Date())
  };
}

/**
 * 更新文章
 * @param {number} id - 文章ID
 * @param {Object} articleData - 更新后的文章数据
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateArticle(id, { title, author, content, category }) {
  const db = database.getDB();

  const [result] = await db.execute(
    'UPDATE articles SET title = ?, author = ?, content = ?, category = ? WHERE id = ?',
    [title, author, content, category, id]
  );

  return result.affectedRows > 0;
}

/**
 * 删除文章
 * @param {number} id - 文章ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteArticle(id) {
  const db = database.getDB();
  const [result] = await db.execute('DELETE FROM articles WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

/**
 * 增加文章浏览量
 * @param {number} id - 文章ID
 * @returns {Promise<boolean>} 是否更新成功
 */
async function incrementViews(id) {
  const db = database.getDB();
  const [result] = await db.execute('UPDATE articles SET views = views + 1 WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

/**
 * 获取文章总数
 * @param {string} [category] - 分类筛选
 * @returns {Promise<number>} 文章总数
 */
async function getArticleCount(category = null) {
  const db = database.getDB();

  let query = 'SELECT COUNT(*) as count FROM articles';
  let params = [];

  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }

  const [result] = await db.execute(query, params);
  return result[0].count;
}

module.exports = {
  getAllArticles,
  getArticleById,
  getArticlesByCategory,
  createArticle,
  updateArticle,
  deleteArticle,
  incrementViews,
  getArticleCount
};
