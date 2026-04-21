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

const app = express();
const PORT = process.env.PORT || 3002;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, './')));

// 腾讯云短信客户端配置（请替换为实际配置）
// const smsClient = new SmsClient({
//   credential: {
//     secretId: "您的SecretId",
//     secretKey: "您的SecretKey",
//   },
//   region: "ap-guangzhou", // 短信服务的地域
// });

// 生成验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送验证码接口
app.post('/api/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '请输入正确的手机号码' });
    }
    
    // 生成验证码
    const code = generateCode();
    
    // 存储验证码到Redis（有效期5分钟）
    await redisClient.set(`code:${phone}`, code, { EX: 300 });
    
    // 调用腾讯云短信API（需要先配置smsClient）
    // const params = {
    //   PhoneNumberSet: [`+86${phone}`],
    //   TemplateId: "您的短信模板ID",
    //   SignName: "您的短信签名",
    //   TemplateParamSet: [code, "5"] // 验证码和有效期（5分钟）
    // };
    // await smsClient.SendSms(params);
    
    // 开发环境：在控制台打印验证码
    console.log('验证码已生成:', code);
    console.log('手机号:', phone);
    
    res.status(200).json({ success: true, message: '验证码已发送' });
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ error: '发送验证码失败，请稍后重试' });
  }
});

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'walanka',
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
    
    // 创建文章表
    await createArticleTable();
    
    // 创建页面内容表
    await createPageContentTable();
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
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('User table created or already exists');
    
    // 创建管理员账号
    await createAdminAccount();
  } catch (error) {
    console.error('Create table failed:', error);
  }
}

// 创建文章表
async function createArticleTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Article table created or already exists');
    
    // 插入默认文章
    await insertDefaultArticles();
  } catch (error) {
    console.error('Create article table failed:', error);
  }
}

// 插入默认文章
async function insertDefaultArticles() {
  try {
    // 检查是否已有文章
    const [existingArticles] = await db.execute('SELECT * FROM articles LIMIT 1');
    if (existingArticles.length === 0) {
      const defaultArticles = [
        {
          title: '不限篇数、永久免费！GEO 内容创作，用瓦兰卡免费GEO工具轻松掌握',
          author: '瓦兰卡免费GEO',
          content: '瓦兰卡免费GEO工具是国内首个免费的GEO优化平台，通过AI技术帮助企业提升品牌在AI平台的影响力和转化率。',
          category: '教程'
        },
        {
          title: '2026年 3-4月国内主流 AI平台核心数据全景报告',
          author: '瓦兰卡免费GEO',
          content: '本报告分析了2026年3-4月国内主流AI平台的核心数据，为企业提供GEO优化的参考。',
          category: '报告'
        },
        {
          title: '瓦兰卡免费GEO工具更新日志',
          author: '瓦兰卡免费GEO',
          content: '本文档记录了瓦兰卡免费GEO工具的更新历史和功能变化。',
          category: '公告'
        },
        {
          title: '用瓦兰卡GEO进行GEO优化教程（商家低成本自己操作教程）',
          author: '瓦兰卡免费GEO',
          content: '本教程详细介绍了如何使用瓦兰卡GEO工具进行GEO优化，帮助商家低成本自己操作。',
          category: '教程'
        },
        {
          title: 'GEO优化技术深度解析',
          author: '瓦兰卡技术团队',
          content: '本文深入解析了GEO优化的技术原理和实践方法，帮助企业更好地理解和应用GEO优化。',
          category: '技术'
        }
      ];
      
      for (const article of defaultArticles) {
        await db.execute(
          'INSERT INTO articles (title, author, content, category) VALUES (?, ?, ?, ?)',
          [article.title, article.author, article.content, article.category]
        );
      }
      console.log('默认文章插入成功');
    }
  } catch (error) {
    console.error('插入默认文章失败:', error);
  }
}

// 创建管理员账号
async function createAdminAccount() {
  try {
    const adminPhone = '15981241372';
    const adminName = 'root';
    const adminPassword = '123456789';
    
    // 检查管理员账号是否已存在
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE phone = ?', [adminPhone]);
    
    if (existingUsers.length === 0) {
      // 创建管理员账号
      await db.execute(
        'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)',
        [adminName, adminPhone, adminPassword, 'admin']
      );
      console.log('管理员账号创建成功');
    } else {
      console.log('管理员账号已存在');
    }
  } catch (error) {
    console.error('创建管理员账号失败:', error);
  }
}

// API路由

// 注册接口
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, password, code } = req.body;
    
    // 验证输入
    if (!name || !phone || !password) {
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
      'INSERT INTO users (name, phone, password) VALUES (?, ?, ?)',
      [name, phone, password]
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
    
    // 删除已使用的验证码
    // await redisClient.del(`code:${phone}`);
    
    res.status(200).json({ success: true, user: newUser, token });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录接口
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // 验证输入
    if (!phone || !password) {
      return res.status(400).json({ error: '请输入手机号和密码' });
    }
    
    // 查找用户
    const [users] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.status(400).json({ error: '用户不存在' });
    }
    
    const user = users[0];
    
    // 验证密码（这里简化处理，实际应该使用密码哈希）
    if (user.password !== password) {
      return res.status(400).json({ error: '密码错误' });
    }
    
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

// 管理员登录接口
app.post('/api/admin/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    
    // 检查管理员账号
    const [users] = await db.execute('SELECT * FROM users WHERE phone = ? AND role = ?', [phone, 'admin']);
    
    if (users.length === 0) {
      return res.status(400).json({ error: '管理员账号不存在' });
    }
    
    const user = users[0];
    
    // 验证密码（这里简化处理，实际应该使用密码哈希）
    if (user.password !== password) {
      return res.status(400).json({ error: '密码错误' });
    }
    
    // 生成JWT token
    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, 'your_jwt_secret', { expiresIn: '7d' });
    
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

// 文章管理接口

// 获取所有文章
app.get('/api/admin/articles', async (req, res) => {
  try {
    const [articles] = await db.execute('SELECT id, title, author, category, views, DATE_FORMAT(created_at, "%Y/%m/%d") as date FROM articles ORDER BY created_at DESC');
    res.status(200).json({ success: true, articles });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ success: false, error: '获取文章列表失败' });
  }
});

// 添加文章
app.post('/api/admin/articles', async (req, res) => {
  try {
    const { title, author, content, category } = req.body;
    
    if (!title || !author || !content || !category) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    // 将文章保存到数据库
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

// 更新文章
app.put('/api/admin/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, content, category } = req.body;
    
    if (!title || !author || !content || !category) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    // 更新数据库中的文章
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

// 删除文章
app.delete('/api/admin/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 从数据库删除文章
    await db.execute('DELETE FROM articles WHERE id = ?', [id]);
    
    res.status(200).json({ success: true, message: '文章删除成功' });
  } catch (error) {
    console.error('删除文章失败:', error);
    res.status(500).json({ success: false, error: '删除文章失败' });
  }
});

// 获取文章详情
app.get('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取文章详情
    const [articles] = await db.execute('SELECT * FROM articles WHERE id = ?', [id]);
    if (articles.length === 0) {
      return res.status(404).json({ success: false, error: '文章不存在' });
    }
    
    // 增加浏览量
    await db.execute('UPDATE articles SET views = views + 1 WHERE id = ?', [id]);
    
    res.status(200).json({ success: true, article: articles[0] });
  } catch (error) {
    console.error('获取文章详情失败:', error);
    res.status(500).json({ success: false, error: '获取文章详情失败' });
  }
});

// 获取分类文章
app.get('/api/articles/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // 获取分类文章
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

// 页面内容管理接口

// 创建页面内容表
async function createPageContentTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS page_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page_name VARCHAR(50) NOT NULL,
        section_name VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_page_section (page_name, section_name)
      )
    `);
    console.log('Page content table created or already exists');
    
    // 插入默认首页内容
    await insertDefaultPageContent();
  } catch (error) {
    console.error('Create page content table failed:', error);
  }
}

// 插入默认首页内容
async function insertDefaultPageContent() {
  try {
    // 检查是否已有首页内容
    const [existingContent] = await db.execute('SELECT * FROM page_content WHERE page_name = "home" LIMIT 1');
    if (existingContent.length === 0) {
      const defaultContent = [
        {
          page_name: 'home',
          section_name: 'hero_title',
          content: '瓦兰卡免费GEO工具'  
        },
        {
          page_name: 'home',
          section_name: 'hero_subtitle',
          content: '不限篇数、永久免费的GEO内容创作助手'  
        },
        {
          page_name: 'home',
          section_name: 'feature_title',
          content: '为什么选择瓦兰卡'  
        },
        {
          page_name: 'home',
          section_name: 'feature_subtitle',
          content: '国内首个免费的GEO优化平台，通过AI技术帮助企业提升品牌在AI平台的影响力和转化率'  
        },
        {
          page_name: 'home',
          section_name: 'pricing_title',
          content: '免费使用'  
        },
        {
          page_name: 'home',
          section_name: 'pricing_subtitle',
          content: '无需信用卡，立即开始使用'  
        },
        {
          page_name: 'home',
          section_name: 'testimonial_title',
          content: '用户评价'  
        },
        {
          page_name: 'home',
          section_name: 'testimonial_subtitle',
          content: '听听我们的用户怎么说'  
        },
        {
          page_name: 'home',
          section_name: 'faq_title',
          content: '常见问题'  
        },
        {
          page_name: 'home',
          section_name: 'faq_subtitle',
          content: '关于瓦兰卡免费GEO工具的常见问题'  
        },
        {
          page_name: 'home',
          section_name: 'footer_text',
          content: '© 2026 瓦兰卡免费GEO工具. 保留所有权利.'  
        }
      ];
      
      for (const item of defaultContent) {
        await db.execute(
          'INSERT INTO page_content (page_name, section_name, content) VALUES (?, ?, ?)',
          [item.page_name, item.section_name, item.content]
        );
      }
      console.log('默认首页内容插入成功');
    }
  } catch (error) {
    console.error('插入默认首页内容失败:', error);
  }
}

// 获取页面内容
app.get('/api/admin/page-content/:page', async (req, res) => {
  try {
    const { page } = req.params;
    
    const [content] = await db.execute(
      'SELECT section_name, content FROM page_content WHERE page_name = ?',
      [page]
    );
    
    // 转换为对象格式
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

// 更新页面内容
app.put('/api/admin/page-content/:page', async (req, res) => {
  try {
    const { page } = req.params;
    const content = req.body;
    
    // 开始事务
    await db.execute('START TRANSACTION');
    
    try {
      // 遍历更新内容
      for (const [section, value] of Object.entries(content)) {
        await db.execute(
          'INSERT INTO page_content (page_name, section_name, content) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE content = ?',
          [page, section, value, value]
        );
      }
      
      // 提交事务
      await db.execute('COMMIT');
      
      res.status(200).json({ success: true, message: '页面内容更新成功' });
    } catch (error) {
      // 回滚事务
      await db.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('更新页面内容失败:', error);
    res.status(500).json({ success: false, error: '更新页面内容失败' });
  }
});

// 支付相关接口

// 创建支付订单
app.post('/api/payment/create', async (req, res) => {
  try {
    const { plan, paymentMethod, orderId } = req.body;
    
    if (!plan || !paymentMethod || !orderId) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    // 计算价格
    const prices = {
      'pro': 999,
      'enterprise': 2999
    };
    
    const price = prices[plan];
    if (!price) {
      return res.status(400).json({ success: false, error: '套餐不存在' });
    }
    
    // 生成支付参数
    // 这里需要根据实际的支付平台API生成支付参数
    // 以下是模拟数据
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
    
    // 保存支付订单到数据库
    // 这里可以将订单信息保存到数据库
    
    res.status(200).json({ success: true, data: paymentData });
  } catch (error) {
    console.error('创建支付订单失败:', error);
    res.status(500).json({ success: false, error: '创建支付订单失败' });
  }
});

// 用户管理接口

// 获取用户列表
app.get('/api/admin/users', async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, name, phone, role, created_at FROM users');
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, error: '获取用户列表失败' });
  }
});

// 添加用户
app.post('/api/admin/users', async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, error: '请输入正确的手机号码' });
    }
    
    // 检查用户是否已存在
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: '该手机号已注册' });
    }
    
    // 添加新用户
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

// 编辑用户
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password, role } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: '请填写完整信息' });
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, error: '请输入正确的手机号码' });
    }
    
    // 检查手机号是否已被其他用户使用
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE phone = ? AND id != ?', [phone, id]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: '该手机号已被其他用户使用' });
    }
    
    // 更新用户信息
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

// 删除用户
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 不能删除超级管理员
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length > 0 && users[0].name === 'root') {
      return res.status(400).json({ success: false, error: '不能删除超级管理员' });
    }
    
    // 删除用户
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    
    res.status(200).json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ success: false, error: '删除用户失败' });
  }
});

// 将用户设为管理员
app.put('/api/admin/users/:id/set-admin', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 更新用户角色
    await db.execute('UPDATE users SET role = ? WHERE id = ?', ['admin', id]);
    
    const [updatedUsers] = await db.execute('SELECT id, name, phone, role, created_at FROM users WHERE id = ?', [id]);
    const updatedUser = updatedUsers[0];
    
    res.status(200).json({ success: true, message: '用户已设为管理员', user: updatedUser });
  } catch (error) {
    console.error('设置管理员失败:', error);
    res.status(500).json({ success: false, error: '设置管理员失败' });
  }
});

// 查询支付状态
app.get('/api/payment/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // 查询支付状态
    // 这里需要根据实际的支付平台API查询支付状态
    // 以下是模拟数据
    const paymentStatus = {
      orderId,
      status: 'success', // success, pending, failed
      amount: 999,
      paidAt: new Date().toISOString()
    };
    
    res.status(200).json({ success: true, data: paymentStatus });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    res.status(500).json({ success: false, error: '查询支付状态失败' });
  }
});

// 支付回调
app.post('/api/payment/callback', async (req, res) => {
  try {
    // 处理支付平台的回调
    // 这里需要根据实际的支付平台API处理回调
    const callbackData = req.body;
    
    // 验证回调签名
    // 这里需要根据实际的支付平台API验证签名
    
    // 更新订单状态
    // 这里可以更新数据库中的订单状态
    
    res.status(200).json({ success: true, message: '回调处理成功' });
  } catch (error) {
    console.error('支付回调处理失败:', error);
    res.status(500).json({ success: false, error: '回调处理失败' });
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

// 文章相关接口

// 获取文章详情
app.get('/api/article/:id', (req, res) => {
  try {
    const articleId = req.params.id;
    
    // 模拟文章数据
    const articles = {
      '1': {
        id: 1,
        title: '不限篇数、永久免费！GEO 内容创作，用瓦兰卡免费GEO工具轻松掌握',
        author: '瓦兰卡免费GEO',
        date: '今天',
        views: 2,
        content: `<p>现在无需再为内容发愁，瓦兰卡免费GEO为专属内容创作工具，全程免费使用，文章数量设任何限制，不限篇数、不限次数，随时批量产出合规范优质文章。</p>
                  <h2>核心功能</h2>
                  <ul>
                    <li>智能内容生成：基于AI技术，快速生成高质量的GEO相关内容</li>
                    <li>批量创作：一次可生成多篇文章，提高效率</li>
                    <li>内容优化：自动优化内容结构和关键词，提高SEO效果</li>
                    <li>免费使用：无任何限制，永久免费</li>
                  </ul>
                  <h2>使用教程</h2>
                  <p>1. 登录瓦兰卡GEO平台</p>
                  <p>2. 进入内容创作页面</p>
                  <p>3. 输入关键词和内容要求</p>
                  <p>4. 点击生成按钮，等待AI创作完成</p>
                  <p>5. 预览并编辑内容</p>
                  <p>6. 下载或直接发布</p>
                  <p>通过瓦兰卡免费GEO工具，您可以轻松掌握GEO内容创作，提升品牌在AI平台的影响力。</p>`
      },
      '2': {
        id: 2,
        title: '2026年 3-4月国内主流 AI平台核心数据全景报告',
        author: '瓦兰卡免费GEO',
        date: '2026/04/06',
        views: 40,
        content: `<p>2026年 3-4月国内主流 AI平台核心数据全景报告当国内 AI产业正从"参数竞赛"全面转向用量与生态竞争，Token（词元）作为智能时代的价值锚点，其用量、日活（DAU）、月活（MAU）成为衡量平台实力的核心指标。</p>
                  <h2>数据概览</h2>
                  <p>本报告收集了国内主流AI平台的核心数据，包括：</p>
                  <ul>
                    <li>Token用量：各平台的Token消耗情况</li>
                    <li>日活跃用户（DAU）：每日活跃用户数量</li>
                    <li>月活跃用户（MAU）：每月活跃用户数量</li>
                    <li>用户增长趋势：用户数量的增长情况</li>
                  </ul>
                  <h2>平台分析</h2>
                  <p>通过对各平台数据的分析，我们发现：</p>
                  <ul>
                    <li>平台A：Token用量领先，用户增长迅速</li>
                    <li>平台B：用户粘性高，活跃度持续上升</li>
                    <li>平台C：新功能推出后，用户增长明显</li>
                  </ul>
                  <p>本报告为企业制定GEO策略提供了重要参考。</p>`
      },
      '3': {
        id: 3,
        title: '瓦兰卡免费GEO工具更新日志',
        author: '瓦兰卡免费GEO',
        date: '2026/04/06',
        views: 20,
        content: `<p>瓦兰卡免费GEO工具更新日志：</p>
                  <h2>新增功能</h2>
                  <ul>
                    <li>智能内容创作：新增AI内容生成功能，支持多种内容类型</li>
                    <li>品牌监测：新增品牌在AI平台的表现监测功能</li>
                    <li>关键词分析：新增关键词趋势分析工具</li>
                  </ul>
                  <h2>优化改进</h2>
                  <ul>
                    <li>算法优化：提升品牌信息在AI平台的抓取效率</li>
                    <li>用户体验：优化界面设计，提高操作便捷性</li>
                    <li>性能优化：提升系统响应速度</li>
                  </ul>
                  <h2>修复问题</h2>
                  <ul>
                    <li>修复了部分用户登录异常的问题</li>
                    <li>修复了数据加载缓慢的问题</li>
                    <li>修复了部分浏览器兼容性问题</li>
                  </ul>
                  <p>感谢用户对瓦兰卡GEO的支持，我们将持续优化产品，为您提供更好的服务。</p>`
      },
      '4': {
        id: 4,
        title: '用瓦兰卡GEO进行GEO优化教程（商家低成本自己操作教程）',
        author: '瓦兰卡免费GEO',
        date: '2026/04/06',
        views: 47,
        content: `<p>本教程专为商家设计，无需大额投入、无需专业团队，手把手教你掌握GEO优化体系，让AI主动识别、信任并推荐你的品牌，快速实现品牌曝光与流量提升。</p>
                  <h2>核心逻辑</h2>
                  <p>用清晰可信的内容匹配用户真实需求，让AI在多场景精准抓取品牌信息，低成本实现品牌优化。</p>
                  <h2>操作步骤</h2>
                  <h3>第一步：品牌信息梳理</h3>
                  <ul>
                    <li>整理品牌核心信息：品牌名称、核心产品、服务优势</li>
                    <li>确定目标受众：明确品牌的目标客户群体</li>
                    <li>分析竞争对手：了解竞争对手的GEO策略</li>
                  </ul>
                  <h3>第二步：内容创作</h3>
                  <ul>
                    <li>使用瓦兰卡GEO工具生成高质量内容</li>
                    <li>优化内容结构：标题、关键词、内容布局</li>
                    <li>确保内容真实性和可信度</li>
                  </ul>
                  <h3>第三步：发布与监测</h3>
                  <ul>
                    <li>在多个平台发布优化后的内容</li>
                    <li>使用瓦兰卡GEO工具监测品牌表现</li>
                    <li>根据监测结果调整优化策略</li>
                  </ul>
                  <h2>注意事项</h2>
                  <ul>
                    <li>持续更新内容，保持品牌信息的新鲜度</li>
                    <li>关注AI平台的算法变化，及时调整策略</li>
                    <li>建立品牌信息的一致性，提高AI对品牌的识别度</li>
                  </ul>
                  <p>通过本教程的学习，您可以掌握GEO优化的核心方法，低成本实现品牌在AI时代的影响力提升。</p>`
      },
      '5': {
        id: 5,
        title: 'GEO优化技术深度解析',
        author: '瓦兰卡技术团队',
        date: '2026/04/01',
        views: 35,
        content: `<p>本文章深入解析GEO优化的核心技术原理，包括如何让AI更好地理解和推荐品牌信息，以及如何通过技术手段提升品牌在AI平台的可见度。</p>
                  <h2>GEO优化的技术原理</h2>
                  <p>GEO（Generative Engine Optimization）是针对生成式AI的优化技术，其核心原理包括：</p>
                  <ul>
                    <li>内容结构优化：通过优化内容的结构和组织方式，使AI更容易理解和处理</li>
                    <li>关键词策略：合理使用关键词，提高品牌信息在AI搜索中的曝光率</li>
                    <li>多模态内容：结合文字、图片、视频等多种形式，丰富品牌信息</li>
                    <li>信息一致性：确保品牌信息在不同平台的一致性，提高AI对品牌的识别度</li>
                  </ul>
                  <h2>技术实现方法</h2>
                  <h3>1. 内容结构化</h3>
                  <p>使用清晰的标题层级、段落结构和列表形式，使内容更易被AI理解。</p>
                  <h3>2. 关键词优化</h3>
                  <p>通过关键词研究，确定目标关键词，并在内容中合理分布。</p>
                  <h3>3. 语义增强</h3>
                  <p>使用相关词汇和语义扩展，增强内容的语义丰富度。</p>
                  <h3>4. 多平台分发</h3>
                  <p>在多个平台发布内容，提高品牌信息的覆盖面。</p>
                  <h2>技术工具</h2>
                  <p>瓦兰卡GEO工具提供了以下技术功能：</p>
                  <ul>
                    <li>智能内容生成：基于AI技术生成优化后的内容</li>
                    <li>关键词分析：分析关键词趋势和竞争情况</li>
                    <li>品牌监测：监测品牌在AI平台的表现</li>
                    <li>效果评估：评估优化效果并提供改进建议</li>
                  </ul>
                  <p>通过技术手段的应用，企业可以更有效地提升品牌在AI时代的影响力。</p>`
      }
    };
    
    const article = articles[articleId];
    
    if (article) {
      res.status(200).json({ success: true, article });
    } else {
      res.status(404).json({ success: false, error: '文章不存在' });
    }
  } catch (error) {
    console.error('获取文章详情失败:', error);
    res.status(500).json({ success: false, error: '获取文章详情失败' });
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