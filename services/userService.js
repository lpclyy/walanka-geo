/**
 * 用户服务模块
 * @module services/userService
 * @description 提供用户相关的业务逻辑处理
 */

const database = require('../models/database');
const { sendSuccess, sendError } = require('../utils/response');
const bcrypt = require('bcryptjs');

/**
 * 创建新用户
 * @param {Object} userData - 用户数据
 * @param {string} userData.name - 用户名
 * @param {string} userData.phone - 手机号
 * @param {string} userData.password - 密码
 * @param {string} [userData.role='user'] - 用户角色
 * @returns {Promise<Object>} 创建的用户信息
 */
async function createUser({ name, phone, password, role = 'user' }) {
  const db = database.getDB();

  const [result] = await db.execute(
    'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)',
    [name, phone, password, role]
  );

  return {
    id: result.insertId,
    name,
    phone,
    role
  };
}

/**
 * 根据手机号查找用户
 * @param {string} phone - 手机号
 * @returns {Promise<Object|null>} 用户对象或null
 */
async function findUserByPhone(phone) {
  const db = database.getDB();
  const [users] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
  return users.length > 0 ? users[0] : null;
}

/**
 * 根据ID查找用户
 * @param {number} id - 用户ID
 * @returns {Promise<Object|null>} 用户对象或null
 */
async function findUserById(id) {
  const db = database.getDB();
  const [users] = await db.execute('SELECT id, name, phone, role, created_at FROM users WHERE id = ?', [id]);
  return users.length > 0 ? users[0] : null;
}

/**
 * 获取所有用户列表
 * @returns {Promise<Array>} 用户列表
 */
async function getAllUsers() {
  const db = database.getDB();
  const [users] = await db.execute('SELECT id, name, phone, role, created_at FROM users ORDER BY created_at DESC');
  return users;
}

/**
 * 更新用户信息
 * @param {number} id - 用户ID
 * @param {Object} userData - 更新后的用户数据
 * @returns {Promise<Object>} 更新后的用户信息
 */
async function updateUser(id, { name, phone, password, role }) {
  const db = database.getDB();

  if (password) {
    await db.execute(
      'UPDATE users SET name = ?, phone = ?, password = ?, role = ? WHERE id = ?',
      [name, phone, password, role, id]
    );
  } else {
    await db.execute(
      'UPDATE users SET name = ?, phone = ?, role = ? WHERE id = ?',
      [name, phone, role, id]
    );
  }

  return findUserById(id);
}

/**
 * 删除用户
 * @param {number} id - 用户ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteUser(id) {
  const db = database.getDB();
  const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

/**
 * 验证用户密码
 * @param {string} inputPassword - 输入的密码
 * @param {string} storedPassword - 存储的密码
 * @returns {boolean} 密码是否匹配
 */
function verifyPassword(inputPassword, storedPassword) {
  return inputPassword === storedPassword;
}

/**
 * 检查用户是否存在
 * @param {string} phone - 手机号
 * @returns {Promise<boolean>} 用户是否存在
 */
async function isUserExists(phone) {
  const user = await findUserByPhone(phone);
  return user !== null;
}

module.exports = {
  createUser,
  findUserByPhone,
  findUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  verifyPassword,
  isUserExists
};
