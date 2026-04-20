const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'walanka_geo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Redis连接配置
const redisClient = redis.createClient({
  url: 'redis://localhost:6379'
});

// 连接Redis
redisClient.connect().catch(console.error);

// 连接MySQL
let db;
async function connectDB() {
  try {
    db = await mysql.createPool(dbConfig);
    console.log('MySQL connected');
    
    // 创建用户表
    await createUserTable();
  } catch (error) {
    console.error('MySQL connection failed:', error);
    process.exit(1);
  }
}

// 创建用户表
async function createUserTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('User table created or already exists');
  } catch (error) {
    console.error('Create table failed:', error);
  }
}

// API路由

// 注册接口
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    // 验证输入
    if (!name || !phone) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '请输入正确的手机号码' });
    }
    
    // 检查用户是否已存在
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: '该手机号已注册' });
    }
    
    // 添加新用户
    const [result] = await db.execute(
      'INSERT INTO users (name, phone) VALUES (?, ?)',
      [name, phone]
    );
    
    const newUser = {
      id: result.insertId,
      name,
      phone,
      role: 'user'
    };
    
    // 生成JWT token
    const token = jwt.sign({ id: newUser.id, phone: newUser.phone }, 'your_jwt_secret', { expiresIn: '7d' });
    
    // 缓存用户信息到Redis
    await redisClient.set(`user:${newUser.id}`, JSON.stringify(newUser), { EX: 86400 });
    
    res.status(200).json({ success: true, user: newUser, token });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录接口
app.post('/api/login', async (req, res) => {
  try {
    const { phone } = req.body;
    
    // 验证输入
    if (!phone) {
      return res.status(400).json({ error: '请输入手机号码' });
    }
    
    // 查找用户
    const [users] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.status(400).json({ error: '用户不存在' });
    }
    
    const user = users[0];
    
    // 生成JWT token
    const token = jwt.sign({ id: user.id, phone: user.phone }, 'your_jwt_secret', { expiresIn: '7d' });
    
    // 缓存用户信息到Redis
    await redisClient.set(`user:${user.id}`, JSON.stringify(user), { EX: 86400 });
    
    res.status(200).json({ success: true, user, token });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取用户信息接口
app.get('/api/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先从Redis获取
    const cachedUser = await redisClient.get(`user:${id}`);
    if (cachedUser) {
      return res.status(200).json({ success: true, user: JSON.parse(cachedUser) });
    }
    
    // 从数据库获取
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const user = users[0];
    
    // 缓存到Redis
    await redisClient.set(`user:${id}`, JSON.stringify(user), { EX: 86400 });
    
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败，请稍后重试' });
  }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 静态文件服务
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, req.path);
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// 启动服务器
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();