# 瓦兰卡 GEO 设计文档

## 1. 项目概述

**项目名称**: 瓦兰卡免费 GEO 工具 (walanka-geo)
**项目描述**: AI时代品牌优化专家 - 通过智能技术帮助企业提升品牌在AI平台的影响力和转化率
**项目类型**: Node.js/Express.js 全栈 Web 应用
**核心功能**: 品牌 GEO（生成式引擎优化）分析、AI 文章生成、提示词优化

---

## 2. 技术栈

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | - | 运行时环境 |
| Express.js | 4.18.2 | Web 框架 |
| mysql2 | 3.9.1 | MySQL 数据库驱动 |
| redis | 4.6.12 | Redis 缓存客户端 |
| jsonwebtoken | 9.0.2 | JWT 认证 |
| bcryptjs | 2.4.3 | 密码加密 |
| axios | 1.15.2 | HTTP 客户端 |
| dotenv | 17.4.2 | 环境变量管理 |

### 前端
- HTML5 + CSS3 + 原生 JavaScript
- 多页面应用 (MPA) 架构

### AI 集成
- **模型**: MiniMax M2.7
- **API**: MiniMax Chat Completions API

---

## 3. 目录结构

```
D:/myweb/
├── admin/                          # 管理员界面
├── config/                         # 配置文件
│   ├── app.js                      # 应用配置 (JWT、分页、验证码等)
│   ├── api.js                      # 第三方API配置
│   ├── database.js                 # 数据库配置 (Redis)
│   ├── db.config.js                # 数据库连接配置
│   └── index.js                    # 配置统一导出
├── middleware/                     # Express 中间件
│   ├── auth.js                     # JWT 认证中间件
│   ├── error.js                    # 错误处理中间件
│   ├── validator.js                # 数据验证中间件
│   └── index.js                    # 中间件统一导出
├── models/                         # 数据模型层
│   ├── brand.js                    # 品牌模型
│   ├── competitor.js               # 竞品模型
│   ├── database.js                 # 数据库连接与初始化
│   └── index.js                    # 模型统一导出
├── public/                         # 静态资源目录
│   ├── admin/                      # 管理后台页面
│   ├── auth/                       # 认证相关页面
│   ├── features/                   # 功能页面
│   │   ├── workbench.html          # 工作台页面
│   │   └── ...
│   └── js/                         # 前端 JS
├── routes/                         # 路由模块
│   ├── auth.js                     # 认证路由
│   ├── admin.js                    # 管理员路由
│   ├── analysis.js                # 分析路由
│   ├── articles.js                 # 文章路由
│   ├── brand.js                    # 品牌路由
│   ├── chat.js                     # AI 对话路由
│   ├── competitor.js               # 竞品路由
│   ├── payment.js                  # 支付路由
│   ├── userBrand.js               # 用户品牌路由
│   └── index.js                   # 路由统一导出
├── services/                       # 业务逻辑服务层
│   ├── aiService.js                # AI 服务 (GEO分析、文章生成)
│   ├── brandService.js             # 品牌服务
│   ├── competitorService.js        # 竞品服务
│   ├── articleService.js           # 文章服务
│   ├── userService.js              # 用户服务
│   ├── paymentService.js           # 支付服务
│   └── ...
├── utils/                          # 工具函数
│   ├── geoParser.js               # GEO 解析工具
│   ├── response.js                # 响应格式化
│   └── validation.js              # 验证工具
├── server.js                       # 服务器入口
├── package.json                    # npm 包配置
└── styles.css                      # 主样式文件
```

---

## 4. 架构设计

### 4.1 分层架构

```
请求 → 路由层 (routes/) → 服务层 (services/) → 模型层 (models/) → 数据库
                ↓
          中间件 (middleware/)
```

### 4.2 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  (浏览器 - HTML/CSS/JS, 移动端适配)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express.js 服务器                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   路由层 (routes/)                   │   │
│  │  auth | articles | admin | payment | chat | brands   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 中间件 (middleware/)                  │   │
│  │           auth | validator | errorHandler           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 服务层 (services/)                   │   │
│  │  userService | brandService | aiService | payment    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 模型层 (models/)                     │   │
│  │            database | brand | competitor              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                    │                │
           ▼                    ▼                ▼
    ┌─────────────┐      ┌─────────────┐   ┌─────────────┐
    │   MySQL     │      │   Redis     │   │  MiniMax    │
    │  Database   │      │   Cache     │   │  LLM API    │
    └─────────────┘      └─────────────┘   └─────────────┘
```

---

## 5. 核心模块

### 5.1 AI 服务 (aiService.js)

核心功能：
- `performAIAnalysis()` - 调用 MiniMax 大模型进行品牌 GEO 分析
- `performPromptAnalysis()` - 提示词分析
- `generateArticle()` - AI 文章生成
- `aiChat()` - AI 对话功能
- `generateBrandPrompts()` - 生成品牌提示词
- `getPromptAnswer()` / `getBatchPromptAnswers()` - 提示词答案获取

**GEO 模板结构** (12个模块):
1. data_overview - 数据总览
2. brand_overview - 品牌概览
3. brand_visibility - 品牌可见度
4. brand_perception - 品牌感知/情感分析
5. topic_analysis - 主题分析
6. citation_analysis - 引用分析
7. prompts_with_snapshots - 提示词快照
8. improvement_suggestions - 改进建议
9. competitor_brand_analysis - 竞品品牌分析
10. competitor_prompt_analysis - 竞品提示词分析
11. competitor_settings - 竞品设置
12. errors - 错误日志

### 5.2 品牌服务 (brandService.js)

功能：
- 品牌 CRUD 操作
- 品牌状态管理 (pending/analyzing/completed/failed)
- 提示词列表管理

### 5.3 竞品服务 (competitorService.js)

功能：
- 竞品信息管理
- 竞品对比分析

---

## 6. 数据模型

### 6.1 数据库表

| 表名 | 说明 |
|------|------|
| users | 用户表 (id, name, phone, password, role) |
| brands | 品牌表 |
| brand_analysis | 品牌分析结果表 (JSON 存储) |
| brand_prompt_list | 提示词列表 |
| brand_prompt_suggestions | 提示词建议 |
| competitors | 竞品表 |
| articles | 文章表 |
| page_content | 页面内容配置表 |
| activity_logs | 活动日志表 |

### 6.2 主要实体关系

```
users 1───< brands (用户拥有多个品牌)
brands 1───< brand_analysis (品牌分析结果)
brands 1───< competitors (品牌对标竞品)
brands 1───< brand_prompt_list (品牌提示词)
```

---

## 7. API 设计

### 7.1 认证 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/send-code | 发送验证码 |
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/admin/login | 管理员登录 |

### 7.2 品牌 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/brands | 创建品牌 |
| GET | /api/brands/:id | 获取品牌详情 |
| GET | /api/user-brands | 获取用户品牌列表 |
| PUT | /api/brands/:id/status | 更新品牌状态 |
| DELETE | /api/brands/:id | 删除品牌 |

### 7.3 分析 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/analysis/start | 启动品牌分析 |
| GET | /api/analysis/:brandId | 获取分析结果 |

### 7.4 支付 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/payment/create | 创建支付 |
| POST | /api/payment/callback | 支付回调 |

### 7.5 竞品 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/competitors | 创建竞品 |
| GET | /api/competitors/:brandId | 获取竞品列表 |
| PUT | /api/competitors/:id | 更新竞品 |
| DELETE | /api/competitors/:id | 删除竞品 |

---

## 8. 前端页面

| 页面 | 路径 | 功能 |
|------|------|------|
| index.html | / | 首页 - 品牌介绍、功能展示 |
| login.html | /login | 用户登录 |
| register.html | /register | 用户注册 |
| admin-login.html | /admin-login | 管理员登录 |
| admin.html | /admin | 管理后台 |
| workbench.html | /workbench | 工作台 |
| features.html | /features | 功能介绍 |
| geo-school.html | /geo-school | GEO 学堂 |
| article-detail.html | /article-detail | 文章详情 |
| cases.html | /cases | 客户案例 |
| faq.html | /faq | 常见问题 |
| subscription.html | /subscription | 订阅页面 |
| payment.html | /payment | 支付页面 |

---

## 9. 第三方集成

| 服务 | 用途 |
|------|------|
| MiniMax API | AI 大模型 (GEO分析、文章生成) |
| 腾讯云短信 | 验证码发送 |
| SiliconFlow | 备用 AI API |
| 微信支付 | 付费订阅 |
| 支付宝 | 付费订阅 |

---

## 10. 安全设计

- **认证**: JWT 无状态认证
- **密码**: bcryptjs 加密存储
- **中间件**: auth 中间件保护需要认证的路由
- **跨域**: cors 中间件配置

---

## 11. 配置文件

| 文件 | 用途 |
|------|------|
| .env | 环境变量 (数据库、JWT密钥、API密钥) |
| config/app.js | 应用配置 (JWT过期时间、分页、验证码配置) |
| config/api.js | 第三方 API 配置 |
| config/database.js | MySQL/Redis 连接配置 |

---

## 12. 部署

详见 `DEPLOYMENT.md` 部署文档。
