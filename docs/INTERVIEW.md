# 瓦兰卡 GEO 项目 - 面试技术文档

## 项目核心价值与技术亮点

**项目简介**：瓦兰卡免费 GEO 工具 - 国内首个免费的 GEO（生成式引擎优化）平台，帮助企业分析品牌在 AI 平台（如 ChatGPT、DeepSeek、豆包等）的可见度。

**核心问题**：当用户在 ChatGPT 等 AI 平台提问时，AI 的回答中是否会提及某个品牌？品牌如何被提及？情感如何？有哪些改进机会？

---

## 一、核心功能详解

### 1. GEO 分析功能

#### 1.1 什么是 GEO？

GEO（Generative Engine Optimization）- 生成式引擎优化，类似于 SEO，但目标是优化品牌在 AI 大模型回答中的表现。

#### 1.2 分析流程

```
用户提交品牌 → 调用 MiniMax 大模型 → 分析品牌在各 AI 平台的可见度 → 返回结构化报告
```

#### 1.3 GEO 模板结构（12个模块）

AI 返回的数据结构非常复杂，包含 12 个模块：

```javascript
{
  data_overview: {           // 数据总览
    total_mentions: 312,     // 总提及次数
    overall_mention_rate: 30.5,  // 提及率
    tested_platforms: ["ChatGPT", "DeepSeek", "豆包", "Kimi", "Gemini"]
  },
  brand_overview: {          // 品牌概览
    ai_visibility_score: 72,   // AI可见度得分
    positive_ratio: 65.2,      // 正面情感占比
  },
  brand_visibility: {        // 品牌可见度（分平台）
    by_platform: [
      { platform: "ChatGPT", mentions: 89, mention_rate: 35.2 },
      { platform: "DeepSeek", mentions: 67, mention_rate: 26.8 }
    ]
  },
  brand_perception: {        // 品牌感知（情感分析）
    aggregate: { positive_count: 203, negative_count: 45 },
    sample_quotes: [          // 引用快照
      { platform: "ChatGPT", quote: "品牌产品非常好用..." }
    ]
  },
  topic_analysis: { clusters: [...] },   // 主题分析
  citation_analysis: { ... },            // 引用分析
  prompts_with_snapshots: [...],         // 提示词快照
  improvement_suggestions: {             // 改进建议
    suggestions: [
      { gap_type: "missing_in_prompt", priority: "high" }
    ]
  },
  competitor_brand_analysis: { competitors: [...] },  // 竞品分析
  competitor_prompt_analysis: [],
  competitor_settings: {},
  errors: []
}
```

---

### 2. AI 服务实现（aiService.js）

#### 2.1 核心函数：`performAIAnalysis`

```javascript
async function performAIAnalysis(brandId, brandInfo, customAgentId = '') {
  // 1. 验证 API 配置
  if (!llmApiKey || !llmApiUrl || !llmModel) {
    return { error: { message: 'MiniMax API配置未完成' } };
  }

  // 2. 获取品牌信息
  let brand = brandInfo || await brandModel.getBrandById(brandId);

  // 3. 生成系统提示词（包含详细的 GEO 模板规范）
  const systemPrompt = generateGeoSystemPrompt(brand.name, brand.website);

  // 4. 调用大模型 API
  const response = await axios.post(llmApiUrl, {
    model: llmModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1,   // 低温度，保证结果确定性
    max_tokens: 16000
  }, { timeout: 300000 });

  // 5. 清理响应（去除 <thinking> 标签等）
  let content = cleanThinkingTags(response.data.choices?.[0]?.message?.content);

  // 6. 提取 JSON 数据
  let parsedData = extractJsonFromText(content);

  // 7. 验证并补充缺失字段
  parsedData = validateAndFillGeoData(parsedData, brand.name, brand.website);

  return parsedData;
}
```

#### 2.2 为什么用 temperature=0.1？

- **高温度（0.7-1.0）**：创意性强，结果多样，适合文章生成
- **低温度（0.1）**：确定性高，结果稳定，适合数据分析
- GEO 分析需要**结果可重复**，所以用低温度

#### 2.3 复杂的数据清理逻辑

```javascript
// 清理 <thinking> 标签（MiniMax M2.7 模型输出）
function cleanThinkingTags(text) {
  // 处理Unicode转义的标签
  cleaned = cleaned.replace(/\\u003c(thinking|thought|reasoning)\\u003e[\s\S]*?\\u003c\/\1\\u003e/gi, '');
  // 移除 <thinking>...</thinking>
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  return cleaned;
}
```

#### 2.4 JSON 提取与容错

```javascript
function extractJsonFromText(text) {
  // 优先处理数组格式
  if (trimmed.startsWith('[')) {
    return extractJsonArray(trimmed);
  }
  // 处理对象格式 - 使用状态机找配对的 { }
  return extractJsonObject(trimmed);
}

// 状态机解析 JSON（处理嵌套和转义）
function extractJsonObject(text) {
  let depth = 0, inString = false, escape = false;
  for (let i = 0; i < substring.length; i++) {
    if (escape) { escape = false; continue; }
    if (char === '\\' && inString) { escape = true; continue; }
    if (char === '"') { inString = !inString; }
    else if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') { depth--; if (depth === 0) endIndex = i; }
    }
  }
  return JSON.parse(jsonStr);
}
```

---

### 3. 品牌服务实现（brandService.js）

#### 3.1 缓存机制

```javascript
const analysisCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 缓存5分钟

function getCachedAnalysis(brandId) {
  const cached = analysisCache.get(brandId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;  // 缓存命中
  }
  analysisCache.delete(brandId);
  return null;
}
```

**为什么要缓存？**
- 品牌分析数据存储在 MySQL 的 JSON 字段中
- 每次查询需要解析 JSON（CPU 消耗）
- 缓存 5 分钟内避免重复解析

#### 3.2 美誉度计算

```javascript
function calculateReputationScore(perceptionData) {
  // 从多种数据格式中提取情感数据（兼容旧模板）
  if (perceptionData?.sentiment_distribution) {
    // 新模板
    positive = perceptionData.sentiment_distribution.positive;
  } else if (perceptionData?.positive !== undefined) {
    // 旧模板
    positive = perceptionData.positive;
  }

  // 公式：正面*1.0 + 中性*0.5 + 负面*0.0
  let reputationScore = Math.round(positive * 1.0 + neutral * 0.5);
  return { reputationScore, positiveRatio: positive, ... };
}
```

#### 3.3 数据双重存储策略

```javascript
// brand_analysis 表：存储完整的 JSON 数据
// brand_metrics 表：存储解析后的关键指标（用于快速查询）

async function saveBrandMetrics(brandId, analysisId, analysisData) {
  // ON DUPLICATE KEY UPDATE：存在则更新，不存在则插入
  await db.execute(
    `INSERT INTO brand_metrics
     (brand_id, analysis_id, visibility_score, mention_rate, ...)
     VALUES (?, ?, ?, ?, ...)
     ON DUPLICATE KEY UPDATE ...`,
    [brandId, analysisId, visibilityScore, mentionRate, ...]
  );
}
```

---

### 4. 竞品分析实现（competitorService.js）

#### 4.1 单竞品分析

```javascript
async function analyzeCompetitor(competitorName, competitorWebsite = '') {
  // 调用大模型分析竞品
  const response = await axios.post(llmApiUrl, {
    model: llmModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1,  // 确定性
    max_tokens: 2000
  });

  const content = cleanThinkingTags(response.data.choices?.[0]?.message?.content);
  const result = JSON.parse(cleanJsonResponse(content));
  return { success: true, data: result };
}
```

#### 4.2 竞品对比洞察生成

```javascript
async function generateCompetitorInsight(brandData, competitorsData) {
  // 拼接竞品数据，调用大模型生成对比分析
  const competitorsText = competitorsData.map((c, i) =>
    `${i + 1}. ${c.name}: 可见度${c.visibility_score}分...`
  ).join('\n');

  const prompt = `请根据以下品牌数据生成竞品对比洞察...`;
  // ...
}
```

---

### 5. 数据库设计（database.js）

#### 5.1 表结构设计

```sql
-- brands 表
CREATE TABLE brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  status ENUM('pending', 'analyzing', 'completed', 'failed') DEFAULT 'pending',
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- brand_analysis 表（JSON 存储）
CREATE TABLE brand_analysis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  overview JSON,        -- 数据总览
  visibility JSON,     -- 品牌可见度
  perception JSON,     -- 品牌感知
  topics JSON,         -- 主题分析
  citations JSON,      -- 引用分析
  suggestions JSON,    -- 改进建议
  INDEX idx_brand_id (brand_id)
);

-- brand_metrics 表（关键指标，用于快速查询）
CREATE TABLE brand_metrics (
  brand_id INT NOT NULL,
  visibility_score INT,      -- 可见度得分
  mention_rate DECIMAL(5,2), -- 提及率
  reputation_score DECIMAL(5,2), -- 美誉度
  ...,
  UNIQUE KEY unique_brand_analysis (brand_id, analysis_id)
);
```

#### 5.2 为什么要分开存储？

| 存储方式 | 优点 | 缺点 |
|----------|------|------|
| 全部存 JSON | 灵活，字段可以随时变化 | 查询慢，每次都要解析 |
| 全部存字段 | 查询快 | 不灵活，改需求要改表结构 |
| **混合存储** | 平衡灵活性和性能 | 需要维护两套数据 |

---

### 6. 分析服务（analysisService.js）

#### 6.1 数据格式转换

```javascript
// 将 GEO 模板格式转换为系统内部格式
function transformFromGeoFormat(geoData) {
  return {
    brandName: geoData.data_overview?.brand_name,
    overview: {
      brandMentionRate: geoData.brand_overview?.visibility_rate,
      positiveSentimentRate: geoData.brand_overview?.positive_ratio,
    },
    visibility: {
      platforms: geoData.brand_visibility?.by_platform?.map(p => ({
        name: p.platform,
        mentionRate: p.mention_rate
      }))
    },
    // ...
  };
}
```

---

## 二、架构设计亮点

### 1. 分层架构

```
请求 → 路由层 (routes/) → 服务层 (services/) → 模型层 (models/) → 数据库
                ↓
          中间件 (middleware/)
```

**好处**：
- 路由层：处理 HTTP 请求/响应
- 服务层：处理业务逻辑
- 模型层：处理数据库操作
- 职责分离，便于维护和测试

### 2. 缓存策略

- **内存缓存** (Map)：5分钟有效期，适合频繁访问的数据
- **数据库索引**：关键字段建立索引，加速查询
- **指标预计算**：将常用的聚合数据提前算好存表

### 3. 容错机制

```javascript
// JSON 解析容错
function safeJsonParse(jsonString, defaultValue = {}) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn('JSON解析失败:', e.message);
    return defaultValue;
  }
}

// API 调用容错
try {
  const response = await axios.post(url, data, { timeout: 300000 });
} catch (error) {
  // 根据错误类型返回友好提示
  return { error: { message: '调用大模型失败', details: error.message } };
}
```

### 4. 数据兼容性

系统支持**新旧两种 GEO 数据格式**的兼容：

```javascript
// 兼容新的 GEO 模板结构
const overview = analysisData?.data_overview || analysisData?.brand_overview || analysisData?.overview || {};

// 兼容中文键名和英文键名
if (perceptionData?.sentiment_distribution) {
  // 新模板结构
} else if (perceptionData?.positive !== undefined) {
  // 旧模板结构
}
```

---

## 三、面试常见问题回答

### Q1: 这个项目的核心价值是什么？

**回答要点**：
- 帮助企业了解自己在 AI 平台（如 ChatGPT）的可见度
- 类似于 SEO，但目标是 AI 大模型
- 通过分析竞品，提供品牌优化建议

### Q2: 为什么使用内存缓存而不是 Redis？

**回答要点**：
- 品牌分析数据是临时缓存，不需要持久化
- Map 操作比 Redis 简单，不需要序列化
- 5 分钟过期的特性适合分析场景（数据会定期更新）

### Q3: JSON 字段和独立字段如何选择？

**回答要点**：
- 结构稳定、查询频繁的用字段（users、brands）
- 结构灵活、嵌套深的用 JSON（analysisData）
- 需要快速查询的关键指标单独存表（brand_metrics）

### Q4: 如何保证 AI 分析结果的一致性？

**回答要点**：
- 使用 `temperature: 0.1` 降低随机性
- 提供详细的系统提示词，统一评估标准
- 确定性优先：相同输入 → 相同输出

### Q5: 数据清理的复杂逻辑是必要的吗？

**回答要点**：
- 大模型返回的内容可能包含 `<thinking>` 标签（思考过程）
- 返回格式可能是 markdown 代码块，需要去掉
- JSON 可能嵌套在文本中，需要状态机提取
- 这些都是为了提高系统的健壮性

---

## 四、技术栈总结

| 层级 | 技术 | 作用 |
|------|------|------|
| Web 框架 | Express.js | HTTP 请求处理、路由 |
| 数据库 | MySQL | 结构化数据存储 |
| 缓存 | Redis (连接中) / Map | 热点数据缓存 |
| AI 集成 | axios + MiniMax API | 大模型调用 |
| 认证 | JWT | 无状态认证 |

---

## 五、项目难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| AI 返回格式不稳定 | 多层容错解析、状态机提取 JSON |
| 数据结构变化快 | JSON 字段存储 + 兼容层代码 |
| 查询性能 | 指标预计算 + 内存缓存 |
| 多格式兼容 | 统一入口、多模板兼容 |
