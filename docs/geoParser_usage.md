# GEO品牌分析报告解析器使用指南

## 概述

本解析器用于解析AI返回的GEO品牌分析报告模板数据，支持服务端(Node.js)和浏览器端两种环境。

## 文件结构

```
├── utils/
│   └── geoParser.js          # 服务端解析器(Node.js)
├── public/
│   └── js/
│       └── geoParser.js      # 浏览器端解析器
└── docs/
    └── geoParser_usage.md    # 本使用文档
```

## 服务端使用(Node.js)

### 安装与导入

```javascript
const { parseGEOReport, validateReport, createAIPlatformChart } = require('../utils/geoParser');
```

### 基本使用流程

```javascript
// 1. 获取AI返回的原始文本
const rawText = `# 品牌名称 GEO 品牌分析报告
数据更新时间：2024-01-15 10:30:00（GMT+8）
品牌名称：示例品牌
...`;

// 2. 解析报告
const result = parseGEOReport(rawText);

if (result.success) {
    // 解析成功，获取数据
    const report = result.data;
    console.log('品牌名称:', report.brandName);
    console.log('数据总览:', report.overview);
    
    // 3. 验证数据完整性
    const validation = validateReport(report);
    if (validation.valid) {
        console.log('数据验证通过');
    } else {
        console.warn('数据验证警告:', validation.warnings);
    }
} else {
    // 解析失败，输出错误信息
    console.error('解析失败:', result.errors);
}
```

## 浏览器端使用

### 引入方式

```html
<!-- 在HTML中引入 -->
<script src="/js/geoParser.js"></script>
```

### 基本使用流程

```javascript
// 1. 获取AI返回的原始文本
const rawText = document.getElementById('aiResponse').value;

// 2. 解析报告
const result = window.GEOParser.parse(rawText);

if (result.success) {
    // 3. 填充到DOM
    window.GEOParser.populateToDOM(result.data);
    
    // 4. 创建可视化图表（需先引入ECharts）
    createCharts(result.data);
} else {
    // 显示错误信息
    alert('解析失败: ' + result.errors.join('\n'));
}
```

## 解析数据结构

### 完整数据结构

```typescript
interface GEOReport {
    brandName: string;                    // 品牌名称
    officialWebsite: string;              // 官网URL
    overview: DataOverview;               // 数据总览
    aiVisibility: AIPlatformVisibility[]; // AI平台可见度
    visibilityNote: string;               // 可见度说明
    visibilityCoreFinding: string;        // 核心发现
    officialPositioning: {                // 官方自我定位
        source: string;
        mission: string;
        coreBusiness: string;
        userScale: string;
        brandUpgrade: string;
    };
    keywords: { keyword: string; frequency: number }[];  // 高频关键词
    perceptionDifferences: string[];      // 品牌认知差异
    searchAssociations: { type: string; example: string }[];  // 搜索联想词
    brandHomeShare: number;               // 品牌词首页占有率(%)
    serviceHomeShare: number;             // 服务相关词占有率(%)
    competitionHomeShare: number;         // 竞争类词占有率(%)
    sentimentDistribution: {              // 情感分布
        positive: number;
        neutral: number;
        negative: number;
        positiveChange: string;
        neutralChange: string;
        negativeChange: string;
    };
    topics: { rank: number; topic: string; coOccurrenceRate: number }[];  // 主题分析
    citationSources: { type: string; percentage: number; representative: string }[];  // 引用来源
    prompts: { queryType: string; question: string; summary: string }[];  // 提示词列表
    competitors: CompetitorAnalysis[];    // 竞品分析
    suggestions: { action: string; expectedEffect: string; priority: string }[];  // 改进建议
}
```

### DataOverview 数据总览

| 字段 | 类型 | 说明 |
|------|------|------|
| updateTime | string | 数据更新时间 |
| aiPlatformCount | number | 覆盖AI平台数 |
| queryCount | number | 执行查询总数 |
| brandMentionRate | number | 平均品牌提及率(%) |
| positiveSentimentRate | number | 平均正面情感占比(%) |
| officialCitationRate | number | 官网引用率(%) |
| dataSourceNote | string | 数据来源说明 |

### AIPlatformVisibility AI平台可见度

| 字段 | 类型 | 说明 |
|------|------|------|
| platform | string | AI平台名称 |
| mentionCount | number | 提及次数 |
| totalQueries | number | 查询总数 |
| mentionRate | number | 提及率(%) |
| remark | string | 备注 |

## 可视化图表创建

### 使用ECharts创建图表

```javascript
// 需要先在HTML中引入ECharts
// <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>

function createCharts(data) {
    // 1. AI平台可见度柱状图
    if (data.aiVisibility && data.aiVisibility.length > 0) {
        createAIPlatformChart('aiPlatformChart', data.aiVisibility);
    }
    
    // 2. 情感分布饼图
    if (data.sentimentDistribution) {
        createSentimentChart('sentimentChart', data.sentimentDistribution);
    }
    
    // 3. 主题分析横向柱状图
    if (data.topics && data.topics.length > 0) {
        createTopicChart('topicChart', data.topics);
    }
    
    // 4. 竞品对比图表
    if (data.competitors && data.competitors.length > 0) {
        createCompetitorChart('competitorChart', data.competitors, data.brandName);
    }
}
```

### HTML容器示例

```html
<!-- AI平台可见度图表 -->
<div id="aiPlatformChart" style="width: 100%; height: 300px;"></div>

<!-- 情感分布图表 -->
<div id="sentimentChart" style="width: 100%; height: 300px;"></div>

<!-- 主题分析图表 -->
<div id="topicChart" style="width: 100%; height: 300px;"></div>

<!-- 竞品对比图表 -->
<div id="competitorChart" style="width: 100%; height: 300px;"></div>
```

## 数据验证与错误处理

### 验证结果结构

```typescript
interface ValidationResult {
    valid: boolean;      // 是否通过验证
    errors: string[];    // 错误信息（阻止使用）
    warnings: string[];  // 警告信息（建议修复）
}
```

### 验证规则

| 规则类型 | 检查内容 | 严重程度 |
|----------|----------|----------|
| 必填字段 | 品牌名称 | 错误 |
| 必填字段 | 官网URL | 警告 |
| 数值范围 | 百分比字段0-100 | 警告 |
| 数据一致性 | 情感分布总和接近100% | 警告 |

### 错误处理示例

```javascript
const result = parseGEOReport(rawText);

if (!result.success) {
    // 解析错误
    showErrorModal('解析失败', result.errors);
    return;
}

const validation = validateReport(result.data);
if (!validation.valid) {
    // 显示警告
    if (validation.errors.length > 0) {
        showErrorModal('数据验证失败', validation.errors);
        return;
    }
    if (validation.warnings.length > 0) {
        showWarningToast('数据存在警告', validation.warnings);
    }
}

// 继续处理数据
processReport(result.data);
```

## 字段映射与DOM填充

### 默认字段映射

```javascript
{
    overview: {
        brandMentionRate: '#brandMentionRate',
        positiveSentimentRate: '#positiveSentimentRate',
        officialCitationRate: '#officialCitationRate',
        aiPlatformCount: '#aiPlatformCount',
        queryCount: '#queryCount',
        updateTime: '#updateTime'
    },
    sentiment: {
        positive: '#sentimentPositive',
        neutral: '#sentimentNeutral',
        negative: '#sentimentNegative'
    },
    topics: { container: '#topicsContainer', maxItems: 5 },
    suggestions: { 
        container: '#suggestionsContainer',
        priorityColors: { 'P0': '#ef4444', 'P1': '#f59e0b', 'P2': '#22c55e' }
    }
}
```

### 自定义映射

```javascript
const customMapping = {
    overview: {
        brandMentionRate: '#customMentionRate',
        updateTime: '#customUpdateTime'
    }
};

window.GEOParser.populateToDOM(data, customMapping);
```

## 模板格式异常处理

### 支持的容错情况

| 异常类型 | 处理方式 |
|----------|----------|
| 字段缺失 | 返回默认值(0或空字符串) |
| 表格格式不规范 | 跳过该行并记录警告 |
| 数值格式错误 | 解析为0并记录警告 |
| 板块顺序变化 | 按板块标题识别，不受顺序影响 |
| 特殊字符干扰 | 自动清理常见特殊字符 |

### 不支持的情况

| 异常类型 | 处理方式 |
|----------|----------|
| 板块标题缺失 | 返回空数据 |
| 表格结构完全破坏 | 返回空数组 |
| 品牌名称缺失 | 解析失败，返回错误 |

## 性能优化建议

### 大数据量处理

```javascript
// 分批处理大量数据
function processLargeReport(text) {
    const result = parseGEOReport(text);
    
    if (result.success) {
        // 按需加载图表
        lazyLoadCharts(result.data);
    }
}

function lazyLoadCharts(data) {
    // 先创建关键图表
    createAIPlatformChart('chart1', data.aiVisibility);
    
    // 延迟创建其他图表
    setTimeout(() => {
        createSentimentChart('chart2', data.sentimentDistribution);
    }, 500);
}
```

### 缓存策略

```javascript
// 使用localStorage缓存解析结果
function getCachedReport(brandName) {
    const cacheKey = `geo_report_${brandName}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        const parsed = JSON.parse(cached);
        // 检查缓存是否过期（30分钟）
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
            return parsed.data;
        }
    }
    return null;
}

function cacheReport(brandName, data) {
    const cacheKey = `geo_report_${brandName}`;
    localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: data
    }));
}
```

## 测试示例

### 测试数据

```javascript
const testData = `# 测试品牌 GEO 品牌分析报告
数据更新时间：2024-01-15 10:30:00（GMT+8）
品牌名称：测试品牌
官方网站：https://example.com

## 板块 1：数据总览
| 指标 | 数值 |
|------|------|
| 数据更新时间 | 2024-01-15 10:30:00 |
| 覆盖 AI 平台数 | 15 |
| 执行查询总数 | 100 |
| 平均品牌提及率 | 85% |
| 平均正面情感占比 | 78% |
| 官网引用率 | 65% |
| 数据来源说明 | 测试数据 |

## 板块 2：品牌 AI 可见度
⚠️ **说明**：测试说明

| AI 平台 | 提及次数 | 提及率 | 备注 |
|---------|----------|--------|------|
| 豆包 | 85/100 | 85% | 测试 |
| 千问 | 78/100 | 78% | 测试 |

**核心发现**：测试发现

## 板块 3：品牌概览
### 3.1 官方自我定位
来源：example.com
- 企业使命：测试使命
- 核心业务：测试业务
- 用户规模：100万
- 品牌升级：2024年

### 3.2 AI 平台视角下的品牌
| 高频关键词 | 出现频次 |
|------------|----------|
| 关键词1 | 50次 |
| 关键词2 | 40次 |

### 3.3 AI 与传统品牌认知差异
1. 差异1
2. 差异2

## 板块 4：品牌可见度
### 4.1 搜索联想词
| 联想词类型 | 示例 |
|------------|------|
| 品牌+服务 | 测试服务 |

### 4.2 搜索首页占有率
- 品牌词"测试品牌"首页占有率：80%
- "测试品牌+服务"相关词：70%
- "测试品牌+竞争"类词：60%

## 板块 5：品牌感知（情感/立场分析）
### 5.1 整体情感分布
| 情感类型 | 占比 | 较上一季度变化 |
|----------|------|----------------|
| 正面 | 78% | +5% |
| 中立/混合 | 17% | -2% |
| 负面 | 5% | -3% |

### 5.2 各平台典型关键词
| 平台类型 | 正面关键词 | 负面关键词 |
|----------|------------|------------|
| 官方/权威媒体 | 正面1 | 负面1 |

### 5.3 典型正面与负面评价
**正面代表**（来源：来源1, 来源2）：
> 正面评价内容

**负面代表**（来源：来源3, 来源4）：
> 负面评价内容

## 板块 6：主题分析
**核心关联主题（Top 5）**
| 排名 | 主题 | 共现率 |
|------|------|--------|
| 1 | 主题1 | 90% |
| 2 | 主题2 | 85% |

## 板块 7：引用分析
### 7.1 来源分类统计
| 来源类型 | 占比 | 代表来源 |
|----------|------|----------|
| 官网引用 | 40% | example.com |

### 7.2 引用习惯对比
| 平台 | 偏好引用来源 | 特点 |
|------|--------------|------|
| 国内新闻 | 官网 | 权威 |

## 板块 8：提示词列表
| 查询类型 | 问题 | 响应摘要 |
|----------|------|----------|
| 品牌认知 | 什么是测试品牌？ | 测试摘要 |

## 板块 9：答案快照
**问题**：「测试问题？」
**来源**：https://example.com
**原文摘录**：
> 测试摘录

## 板块 10：改进建议 + 竞品分析
### 10.1 竞品设置说明
| 竞品 | 选择依据 |
|------|----------|
| 竞品A | 市场份额 |

### 10.2 竞品品牌分析表
| 指标 | 测试品牌 | 竞品A | 竞品B |
|------|----------|-----------|-----------|
| 市场份额 | 30% | 40% | 30% |
| 情感正面率 | 78% | 80% | 75% |
| AI 提及率 | 85% | 88% | 80% |
| 官方引用率 | 65% | 70% | 60% |

### 10.3 竞品提示词分析
**竞品A**：
- 核心策略：策略A
- AI 关联：关联A

### 10.4 SEO / GEO 改进建议
| 行动 | 预期效果 | 优先级 |
|------|----------|--------|
| 行动1 | 效果1 | P0 |
| 行动2 | 效果2 | P1 |`;
```

### 测试代码

```javascript
// 测试解析
const result = parseGEOReport(testData);
console.assert(result.success, '解析应该成功');
console.assert(result.data.brandName === '测试品牌', '品牌名称解析错误');
console.assert(result.data.overview.brandMentionRate === 85, '提及率解析错误');
console.assert(result.data.aiVisibility.length === 2, 'AI平台数量错误');

// 测试验证
const validation = validateReport(result.data);
console.assert(validation.valid, '数据验证应该通过');
```

## 已知问题与改进建议

### 模板设计问题

| 问题 | 位置 | 描述 | 改进建议 |
|------|------|------|----------|
| 字段定义不清晰 | 多处 | 部分字段使用`{{X}}`等占位符，语义不明确 | 使用更具描述性的占位符名称 |
| 缺少数据类型说明 | 全部 | 模板未指定字段数据类型 | 添加数据类型注释 |
| 表格结构复杂 | 板块2、5、6等 | 表格嵌套和格式多样，增加解析难度 | 统一表格格式规范 |
| 缺少必填字段标识 | 全部 | 未明确哪些字段是必填的 | 添加必填字段标记 |

### 解析器改进方向

1. **支持多模板版本**：增加模板版本识别，支持向后兼容
2. **智能字段映射**：根据模板自动识别字段，减少硬编码
3. **异步解析**：支持大数据量异步解析，避免阻塞
4. **可视化配置生成**：根据数据自动生成图表配置

## 技术支持

如在使用过程中遇到问题，或需要定制开发，请联系技术支持团队。

---

*文档版本：1.0.0*
*最后更新：2024-01-15*
