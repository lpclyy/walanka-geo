/**
 * 瓦兰卡免费GEO工具 - 服务器入口文件
 * @module server
 * @description 主服务器文件，负责应用初始化和请求处理
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const config = require('./config');
const database = require('./models/database');
const routes = require('./routes');
const { errorHandler, asyncHandler } = require('./middleware');

const app = express();
const PORT = config.app.server.port;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, './')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', routes.auth);
app.use('/api/articles', routes.articles);
app.use('/api/admin', routes.admin);
app.use('/api/payment', routes.payment);
app.use('/api/chat', routes.chat);
app.use('/api/brands', routes.brand);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/auth/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/auth/register.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/auth/admin-login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/admin.html'));
});

app.get('/workbench', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/features/workbench.html'));
});

app.get('/subscription', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/features/subscription.html'));
});

app.get('/payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/features/payment.html'));
});

app.get('/geo-school', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/features/geo-school.html'));
});

app.get('/article-detail', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/features/article-detail.html'));
});

app.get('/features', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/features/features.html'));
});

app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/features/faq.html'));
});

app.get('/cases', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/features/cases.html'));
});

app.use(errorHandler);

async function startServer() {
  try {
    await database.connectDB();
    console.log('数据库连接成功');

    try {
      await database.connectRedis();
      console.log('Redis连接成功');
    } catch (redisError) {
      console.warn('Redis连接失败，应用将继续运行:', redisError.message);
    }

    app.listen(PORT, () => {
      console.log(`服务器运行中，端口: ${PORT}`);
      console.log(`环境: ${config.app.server.env}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
