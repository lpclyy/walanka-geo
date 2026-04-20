// 数据库连接配置
require('dotenv').config();
const mysql = require('mysql2/promise');

// 数据库连接池配置
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password:'123456', // 请根据实际情况修改
  database: 'valanka_geo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
}

// 执行SQL查询
async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('SQL查询失败:', error);
    throw error;
  }
}

// 导出数据库操作对象
module.exports = {
  pool,
  testConnection,
  query
};
