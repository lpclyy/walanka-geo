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
const { errorHandler } = require('./middleware');

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

const pageRoutes = [
  { path: '/login', file: 'public/auth/login.html' },
  { path: '/register', file: 'public/auth/register.html' },
  { path: '/admin-login', file: 'public/auth/admin-login.html' },
  { path: '/admin', file: 'public/admin/admin.html' },
  { path: '/workbench', file: 'public/features/workbench.html' },
  { path: '/subscription', file: 'public/features/subscription.html' },
  { path: '/payment', file: 'public/features/payment.html' },
  { path: '/geo-school', file: 'public/features/geo-school.html' },
  { path: '/article-detail', file: 'public/features/article-detail.html' },
  { path: '/features', file: 'public/features/features.html' },
  { path: '/faq', file: 'public/features/faq.html' },
  { path: '/cases', file: 'public/features/cases.html' }
];

pageRoutes.forEach(route => {
  app.get(route.path, (req, res) => {
    res.sendFile(path.join(__dirname, route.file));
  });
  app.get(`${route.path}.html`, (req, res) => {
    res.sendFile(path.join(__dirname, route.file));
  });
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
      console.log('已注册的页面路由:');
      pageRoutes.forEach(route => {
        console.log(`  - ${route.path}`);
        console.log(`  - ${route.path}.html`);
      });
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
