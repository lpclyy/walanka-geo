const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const tencentcloud = require("tencentcloud-sdk-nodejs");
const SmsClient = tencentcloud.sms.v20210111.Client;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

const config = require('./config/db.config');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, './')));

const database = require('./models/database');
const brandRoutes = require('./routes/brand');

let db = database.getDB();
let redisClient = database.getRedisClient();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '请输入正确的手机号码' });
    }
    
    const code = generateCode();
    
    await redisClient.set(`code:${phone}`, code, { EX: 300 });
    
    console.log('验证码已生成:', code);
    console.log('手机号:', phone);
    
    res.status(200).json({ success: true, message: '验证码已发送' });
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ error: '发送验证码失败，请稍后重试' });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, password, code } = req.body;
    
    if (!name || !phone || !password) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '请输入正确的手机号码' });
    }
    
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: '该手机号已注册' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO users (name, phone, password) VALUES (?, ?, ?)',
      [name, phone, password]
    );
    
    const newUser = {
      id: result.insertId,
      name,
      phone,
      role: 'user'
    };
    
    const token = jwt.sign({ id: newUser.id, phone: newUser.phone }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    
    await redisClient.set(`user:${newUser.id}`, JSON.stringify(newUser), { EX: 86400 });
    
    res.status(200).json({ success: true, user: newUser, token });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: '请输入手机号和密码' });
    }
    
    const [users] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.status(400).json({ error: '用户不存在' });
    }
    
    const user = users[0];
    
    if (user.password !== password) {
      return res.status(400).json({ error: '密码错误' });
    }
    
    const token = jwt.sign({ id: user.id, phone: user.phone }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    
    await redisClient.set(`user:${user.id}`, JSON.stringify(user), { EX: 86400 });
    
    res.status(200).json({ success: true, user, token });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    
    const [users] = await db.execute('SELECT * FROM users WHERE phone = ? AND role = ?', [phone, 'admin']);
    
    if (users.length === 0) {
      return res.status(400).json({ error: '管理员账号不存在' });
    }
    
    const user = users[0];
    
    if (user.password !== password) {
      return res.status(400).json({ error: '密码错误' });
    }
    
    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

app.get('/api/admin/articles', async (req, res) => {
  try {
    const [articles] = await db.execute('SELECT id, title, author, category, views, DATE_FORMAT(created_at, "%Y/%m/%d") as date FROM articles ORDER BY created_at DESC');
    res.status(200).json({ success: true, articles });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ success: false, error: '获取文章列表失败' });
  }
});

app.post('/api/admin/articles', async (req, res) => {
  try {
    const { title, author, content, category } = req.body;
    
    if (!title || !author || !content || !category) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO articles (title, author, content, category) VALUES (?, ?, ?, ?)',
      [title, author, content, category]
    );
    
    res.status(200).json({ success: true, message: '文章添加成功' });
  } catch (error) {
    console.error('添加文章失败:', error);
    res.status(500).json({ success: false, error: '添加文章失败' });
  }
});

app.put('/api/admin/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, content, category } = req.body;
    
    if (!title || !author || !content || !category) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    await db.execute(
      'UPDATE articles SET title = ?, author = ?, content = ?, category = ? WHERE id = ?',
      [title, author, content, category, id]
    );
    
    res.status(200).json({ success: true, message: '文章更新成功' });
  } catch (error) {
    console.error('更新文章失败:', error);
    res.status(500).json({ success: false, error: '更新文章失败' });
  }
});

app.delete('/api/admin/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.execute('DELETE FROM articles WHERE id = ?', [id]);
    
    res.status(200).json({ success: true, message: '文章删除成功' });
  } catch (error) {
    console.error('删除文章失败:', error);
    res.status(500).json({ success: false, error: '删除文章失败' });
  }
});

app.get('/api/admin/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [articles] = await db.execute('SELECT * FROM articles WHERE id = ?', [id]);
    if (articles.length === 0) {
      return res.status(404).json({ success: false, error: '文章不存在' });
    }
    
    res.status(200).json({ success: true, article: articles[0] });
  } catch (error) {
    console.error('获取文章详情失败:', error);
    res.status(500).json({ success: false, error: '获取文章详情失败' });
  }
});

app.get('/api/admin/stats/visits', async (req, res) => {
  try {
    res.status(200).json({ success: true, visits: 42 });
  } catch (error) {
    console.error('获取访问量失败:', error);
    res.status(500).json({ success: false, error: '获取访问量失败' });
  }
});

app.get('/api/admin/stats/active-users', async (req, res) => {
  try {
    res.status(200).json({ success: true, activeUsers: 1 });
  } catch (error) {
    console.error('获取活跃用户数失败:', error);
    res.status(500).json({ success: false, error: '获取活跃用户数失败' });
  }
});

app.get('/api/admin/activities', async (req, res) => {
  try {
    // 模拟活动数据，包含用户和文章操作
    const activities = [
      { icon: 'fa-user-plus', time: '今天 14:30', text: '管理员添加了新用户' },
      { icon: 'fa-user-edit', time: '今天 13:45', text: '管理员修改了用户信息' },
      { icon: 'fa-user-minus', time: '今天 11:20', text: '管理员删除了用户' },
      { icon: 'fa-file-plus', time: '昨天 16:15', text: '管理员添加了新文章' },
      { icon: 'fa-file-edit', time: '昨天 14:50', text: '管理员编辑了文章' },
      { icon: 'fa-file-minus', time: '昨天 10:30', text: '管理员删除了文章' },
      { icon: 'fa-sign-in-alt', time: '昨天 09:00', text: '管理员登录系统' }
    ];
    res.status(200).json({ success: true, activities });
  } catch (error) {
    console.error('获取活动数据失败:', error);
    res.status(500).json({ success: false, error: '获取活动数据失败' });
  }
});

app.get('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [articles] = await db.execute('SELECT * FROM articles WHERE id = ?', [id]);
    if (articles.length === 0) {
      return res.status(404).json({ success: false, error: '文章不存在' });
    }
    
    await db.execute('UPDATE articles SET views = views + 1 WHERE id = ?', [id]);
    
    res.status(200).json({ success: true, article: articles[0] });
  } catch (error) {
    console.error('获取文章详情失败:', error);
    res.status(500).json({ success: false, error: '获取文章详情失败' });
  }
});

app.get('/api/articles/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const [articles] = await db.execute(
      'SELECT id, title, author, category, views, DATE_FORMAT(created_at, "%Y/%m/%d") as date FROM articles WHERE category = ? ORDER BY created_at DESC',
      [category]
    );
    
    res.status(200).json({ success: true, articles });
  } catch (error) {
    console.error('获取分类文章失败:', error);
    res.status(500).json({ success: false, error: '获取分类文章失败' });
  }
});

app.get('/api/articles', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT id, title, author, category, views, DATE_FORMAT(created_at, "%Y/%m/%d") as date FROM articles';
    let params = [];
    
    if (category && category !== 'all') {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [articles] = await db.execute(query, params);
    
    res.status(200).json({ success: true, articles });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ success: false, error: '获取文章列表失败' });
  }
});

app.get('/api/admin/page-content/:page', async (req, res) => {
  try {
    const { page } = req.params;
    
    const [content] = await db.execute(
      'SELECT section_name, content FROM page_content WHERE page_name = ?',
      [page]
    );
    
    const contentObj = {};
    content.forEach(item => {
      contentObj[item.section_name] = item.content;
    });
    
    res.status(200).json({ success: true, content: contentObj });
  } catch (error) {
    console.error('获取页面内容失败:', error);
    res.status(500).json({ success: false, error: '获取页面内容失败' });
  }
});

app.put('/api/admin/page-content/:page', async (req, res) => {
  try {
    const { page } = req.params;
    const content = req.body;
    
    await db.execute('START TRANSACTION');
    
    try {
      for (const [section, value] of Object.entries(content)) {
        await db.execute(
          'INSERT INTO page_content (page_name, section_name, content) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE content = ?',
          [page, section, value, value]
        );
      }
      
      await db.execute('COMMIT');
      
      res.status(200).json({ success: true, message: '页面内容更新成功' });
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('更新页面内容失败:', error);
    res.status(500).json({ success: false, error: '更新页面内容失败' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的对话内容' });
    }
    
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.SF_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    console.log('API响应状态:', response.status);
    
    if (!response.ok) {
      try {
        const errorData = await response.json();
        console.error('API错误响应:', errorData);
        throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorData.error?.message || '未知错误'}`);
      } catch (error) {
        console.error('解析错误响应失败:', error);
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      throw new Error('API响应格式错误');
    }
    
    const answer = data.choices[0].message.content;
    
    res.status(200).json({ success: true, answer });
  } catch (error) {
    console.error('AI对话失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api/brands', brandRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 用户管理API
app.get('/api/admin/users', async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, name, phone, role, created_at FROM users');
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, error: '获取用户列表失败' });
  }
});

app.post('/api/admin/users', async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, error: '请输入正确的手机号码' });
    }
    
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: '该手机号已注册' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)',
      [name, phone, password, role || 'user']
    );
    
    const newUser = {
      id: result.insertId,
      name,
      phone,
      role: role || 'user',
      created_at: new Date()
    };
    
    res.status(200).json({ success: true, message: '用户添加成功', user: newUser });
  } catch (error) {
    console.error('添加用户失败:', error);
    res.status(500).json({ success: false, error: '添加用户失败' });
  }
});

app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password, role } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, error: '请输入正确的手机号码' });
    }
    
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE phone = ? AND id != ?', [phone, id]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: '该手机号已被其他用户使用' });
    }
    
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
    
    const [updatedUsers] = await db.execute('SELECT id, name, phone, role, created_at FROM users WHERE id = ?', [id]);
    const updatedUser = updatedUsers[0];
    
    res.status(200).json({ success: true, message: '用户更新成功', user: updatedUser });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ success: false, error: '更新用户失败' });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    
    res.status(200).json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ success: false, error: '删除用户失败' });
  }
});

app.get('*', (req, res) => {
  const filePath = path.join(__dirname, req.path);
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

async function startServer() {
  try {
    await database.connectDB();
  } catch (error) {
    console.error('数据库连接失败，服务器将继续运行:', error);
  }
  try {
    await database.connectRedis();
  } catch (error) {
    console.error('Redis连接失败，服务器将继续运行:', error);
  }
  db = database.getDB();
  redisClient = database.getRedisClient();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();