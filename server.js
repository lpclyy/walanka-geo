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
    const ipAddress = req.ip || req.connection.remoteAddress;
    
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
    
    // 记录登录活动
    await activityService.logActivity(user.id, user.name, 'login', '登录了管理系统', ipAddress);
    
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
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    if (!title || !author || !content || !category) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO articles (title, author, content, category) VALUES (?, ?, ?, ?)',
      [title, author, content, category]
    );
    
    // 记录添加文章活动
    const adminUser = JSON.parse(req.headers.authorization?.split(' ')[1] || '{}');
    await activityService.logActivity(
      adminUser.id || 1, 
      adminUser.name || '管理员', 
      'add_article', 
      `添加了文章《${title}》`, 
      ipAddress
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
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    if (!title || !author || !content || !category) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    await db.execute(
      'UPDATE articles SET title = ?, author = ?, content = ?, category = ? WHERE id = ?',
      [title, author, content, category, id]
    );
    
    // 记录编辑文章活动
    const adminUser = JSON.parse(req.headers.authorization?.split(' ')[1] || '{}');
    await activityService.logActivity(
      adminUser.id || 1, 
      adminUser.name || '管理员', 
      'edit_article', 
      `编辑了文章《${title}》`, 
      ipAddress
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
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // 获取文章信息
    const [articles] = await db.execute('SELECT title FROM articles WHERE id = ?', [id]);
    const articleTitle = articles.length > 0 ? articles[0].title : '未知文章';
    
    await db.execute('DELETE FROM articles WHERE id = ?', [id]);
    
    // 记录删除文章活动
    const adminUser = JSON.parse(req.headers.authorization?.split(' ')[1] || '{}');
    await activityService.logActivity(
      adminUser.id || 1, 
      adminUser.name || '管理员', 
      'delete_article', 
      `删除了文章《${articleTitle}》`, 
      ipAddress
    );
    
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
    // 从数据库获取实际访问量数据
    const [result] = await db.execute('SELECT COUNT(*) as visits FROM page_views');
    const visits = result[0].visits || 0;
    res.status(200).json({ success: true, visits });
  } catch (error) {
    console.error('获取访问量失败:', error);
    // 当表不存在时，返回0
    res.status(200).json({ success: true, visits: 0 });
  }
});

app.get('/api/admin/stats/active-users', async (req, res) => {
  try {
    // 从数据库获取实际活跃用户数
    const [result] = await db.execute('SELECT COUNT(*) as activeUsers FROM users');
    const activeUsers = result[0].activeUsers || 0;
    res.status(200).json({ success: true, activeUsers });
  } catch (error) {
    console.error('获取活跃用户数失败:', error);
    res.status(500).json({ success: false, error: '获取活跃用户数失败' });
  }
});

const activityService = require('./services/activityService');

app.get('/api/admin/activities', async (req, res) => {
  try {
    const activities = await activityService.getRecentActivities(10);
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
    const ipAddress = req.ip || req.connection.remoteAddress;
    
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
    
    // 记录添加用户活动
    const adminUser = JSON.parse(req.headers.authorization?.split(' ')[1] || '{}');
    await activityService.logActivity(
      adminUser.id || 1, 
      adminUser.name || '管理员', 
      'add_user', 
      `添加了新用户 ${name}`, 
      ipAddress
    );
    
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
    const ipAddress = req.ip || req.connection.remoteAddress;
    
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
    
    // 记录编辑用户活动
    const adminUser = JSON.parse(req.headers.authorization?.split(' ')[1] || '{}');
    await activityService.logActivity(
      adminUser.id || 1, 
      adminUser.name || '管理员', 
      'edit_user', 
      `修改了用户 ${name} 的信息`, 
      ipAddress
    );
    
    res.status(200).json({ success: true, message: '用户更新成功', user: updatedUser });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ success: false, error: '更新用户失败' });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // 获取用户信息
    const [users] = await db.execute('SELECT name FROM users WHERE id = ?', [id]);
    const userName = users.length > 0 ? users[0].name : '未知用户';
    
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    
    // 记录删除用户活动
    const adminUser = JSON.parse(req.headers.authorization?.split(' ')[1] || '{}');
    await activityService.logActivity(
      adminUser.id || 1, 
      adminUser.name || '管理员', 
      'delete_user', 
      `删除了用户 ${userName}`, 
      ipAddress
    );
    
    res.status(200).json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ success: false, error: '删除用户失败' });
  }
});

// AI对话接口
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ success: false, error: '问题不能为空' });
    }
    
    // 从环境变量获取配置
    const apiKey = process.env.LLM_API_KEY;
    const apiUrl = process.env.LLM_API_URL;
    const model = process.env.LLM_MODEL;
    
    if (!apiKey || !apiUrl || !model) {
      return res.status(500).json({ success: false, error: 'API配置未设置' });
    }
    
    // 调用大模型API
    console.log('调用大模型API:', {
      apiUrl,
      model,
      question: question.substring(0, 50) + '...'
    });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是瓦兰卡AI助手，专注于GEO优化、品牌AI表现监测、内容创作等相关领域的专业知识。请以专业、友好的语气回答用户的问题，提供详细且有价值的信息。'
          },
          {
            role: 'user',
            content: question
          }
        ],
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

// 支付相关API
app.post('/api/payment/create', async (req, res) => {
  try {
    const { plan, paymentMethod, orderId } = req.body;
    
    if (!plan || !paymentMethod || !orderId) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 套餐价格配置
    const planPrices = {
      'pro': 999,
      'enterprise': 2999
    };
    
    const price = planPrices[plan] || 999;
    
    // 生成支付数据
    const paymentData = {
      orderId,
      plan,
      amount: price,
      paymentMethod,
      qrCodeUrl: paymentMethod === 'wechat' 
        ? 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wechat%20pay%20qr%20code&image_size=square' 
        : 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=alipay%20qr%20code&image_size=square',
      payUrl: `https://payment.example.com/pay?orderId=${orderId}&amount=${price}&method=${paymentMethod}`,
      createdAt: new Date().toISOString()
    };
    
    // 这里可以添加订单存储逻辑
    console.log('创建支付订单:', paymentData);
    
    res.status(200).json({ success: true, data: paymentData });
  } catch (error) {
    console.error('创建支付订单失败:', error);
    res.status(500).json({ success: false, error: '创建支付订单失败' });
  }
});

app.get('/api/payment/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ success: false, error: '缺少订单编号' });
    }
    
    // 模拟支付状态查询
    const paymentStatus = {
      orderId,
      status: 'success', // 模拟支付成功
      amount: 999,
      paidAt: new Date().toISOString(),
      paymentMethod: 'wechat'
    };
    
    console.log('查询支付状态:', paymentStatus);
    
    res.status(200).json({ success: true, data: paymentStatus });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    res.status(500).json({ success: false, error: '查询支付状态失败' });
  }
});

app.post('/api/payment/callback', async (req, res) => {
  try {
    const callbackData = req.body;
    
    console.log('支付回调数据:', callbackData);
    
    // 处理支付回调逻辑
    // 这里可以更新订单状态、用户订阅信息等
    
    res.status(200).json({ success: true, message: '回调处理成功' });
  } catch (error) {
    console.error('处理支付回调失败:', error);
    res.status(500).json({ success: false, error: '处理支付回调失败' });
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