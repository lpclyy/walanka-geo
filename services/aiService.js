require('dotenv').config();
const brandModel = require('../models/brand');

// 安全的JSON解析函数，从根本上解决解析问题
function safeJsonParse(content) {
  try {
    console.log('开始解析JSON:', content.substring(0, 100) + '...');
    
    // 1. 清理内容
    let cleaned = content || '';
    
    // 2. 移除所有空白字符（包括换行、制表符等）
    cleaned = cleaned.trim();
    
    // 3. 移除代码块标记
    cleaned = cleaned.replace(/^```json|^```|^``json|^`json|```$|``$|`$/g, '').trim();
    
    // 4. 移除可能的前缀和后缀
    cleaned = cleaned.replace(/^json|^JSON|json$|JSON$/g, '').trim();
    
    // 5. 确保内容是有效的JSON
    if (!cleaned || !cleaned.startsWith('{') || !cleaned.endsWith('}')) {
      // 尝试提取JSON部分
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
        console.log('提取到JSON部分:', cleaned.substring(0, 100) + '...');
      } else {
        throw new Error('无法提取有效的JSON');
      }
    }
    
    // 6. 尝试解析
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.log('解析失败，尝试修复JSON...');
      
      // 7. 尝试修复常见的JSON格式问题
      // 移除多余的逗号
      cleaned = cleaned.replace(/,\s*}/g, '}');
      cleaned = cleaned.replace(/,\s*\]/g, ']');
      
      // 确保字符串使用双引号
      cleaned = cleaned.replace(/(['`])([^'`]+)\1/g, '"$2"');
      
      // 尝试再次解析
      return JSON.parse(cleaned);
    }
  } catch (error) {
    console.error('JSON解析完全失败:', error);
    console.error('原始内容:', content);
    // 返回默认值，确保系统能够继续运行
    return {
      error: 'JSON解析失败',
      originalContent: content.substring(0, 200)
    };
  }
}

// 解析geo模板格式的数据
function parseGeoTemplate(content, brandName) {
  try {
    console.log('开始解析geo模板数据:', content.substring(0, 100) + '...');
    
    // 初始化结果对象，不使用默认值
    const result = {
      overview: {
        brandName: brandName,
        summary: '',
        overallScore: 0,
        confidence: 0
      },
      visibility: {
        overallVisibility: 0,
        mentionCount: 0,
        weeklyChange: '',
        industryRank: '',
        platforms: [],
        trend: []
      },
      perception: {
        positive: 0,
        neutral: 0,
        negative: 0,
        keywords: []
      },
      topics: [],
      citations: [],
      suggestions: [],
      competition: {
        competitors: [],
        competitiveAdvantage: ''
      }
    };
    
    // 解析数据总览
    const dataOverviewMatch = content.match(/## 📊 数据总览[\s\S]*?(?=## 📖|$)/);
    if (dataOverviewMatch) {
      const dataOverview = dataOverviewMatch[0];
      const mentionCount = dataOverview.match(/AI 提及总次数：(\d+) 次/);
      const positiveCount = dataOverview.match(/正面情感回答数量：(\d+) 条/);
      const neutralCount = dataOverview.match(/中性情感回答数量：(\d+) 条/);
      const negativeCount = dataOverview.match(/负面情感回答数量：(\d+) 条/);
      
      if (mentionCount) result.visibility.mentionCount = parseInt(mentionCount[1]);
      if (positiveCount) result.perception.positive = parseInt(positiveCount[1]);
      if (neutralCount) result.perception.neutral = parseInt(neutralCount[1]);
      if (negativeCount) result.perception.negative = parseInt(negativeCount[1]);
    } else {
      throw new Error('未找到数据总览部分');
    }
    
    // 解析品牌概览
    const brandOverviewMatch = content.match(/## 📖 品牌概览[\s\S]*?(?=## 📈|$)/);
    if (brandOverviewMatch) {
      const brandOverview = brandOverviewMatch[0];
      result.overview.summary = brandOverview.substring(0, 100) + '...';
    } else {
      throw new Error('未找到品牌概览部分');
    }
    
    // 解析品牌可见度
    const visibilityMatch = content.match(/## 📈 品牌可见度[\s\S]*?(?=## 💬|$)/);
    if (visibilityMatch) {
      const visibility = visibilityMatch[0];
      const scoreMatch = visibility.match(/综合可见度得分（百分制）：(\d+) 分/);
      const platformsMatch = visibility.match(/\| 模型名称 \| 品牌出现次数 \| 出现率（%） \|[\s\S]*?\| (\w+) \| (\d+) \| (\d+) \|/g);
      
      if (scoreMatch) result.visibility.overallVisibility = parseInt(scoreMatch[1]);
      if (platformsMatch) {
        platformsMatch.forEach(match => {
          const platformMatch = match.match(/\| (\w+) \| (\d+) \| (\d+) \|/);
          if (platformMatch) {
            result.visibility.platforms.push({
              name: platformMatch[1],
              visibility: parseInt(platformMatch[3])
            });
          }
        });
      }
    } else {
      throw new Error('未找到品牌可见度部分');
    }
    
    // 解析品牌感知
    const perceptionMatch = content.match(/## 💬 品牌感知[\s\S]*?(?=## 🔍|$)/);
    if (perceptionMatch) {
      const perception = perceptionMatch[0];
      const keywordsMatch = perception.match(/高频情感词表（词:出现次数）：[\s\S]*?-(\w+): (\d+)/g);
      
      if (keywordsMatch) {
        keywordsMatch.forEach(match => {
          const keywordMatch = match.match(/-(\w+): (\d+)/);
          if (keywordMatch) {
            result.perception.keywords.push(keywordMatch[1]);
          }
        });
      }
    } else {
      throw new Error('未找到品牌感知部分');
    }
    
    // 解析主题分析
    const topicsMatch = content.match(/## 🔍 主题分析[\s\S]*?(?=## 📚|$)/);
    if (topicsMatch) {
      const topics = topicsMatch[0];
      const topicMatch = topics.match(/\| (\d+) \| (\w+) \| (\d+) \|/g);
      
      if (topicMatch) {
        topicMatch.forEach(match => {
          const topic = match.match(/\| (\d+) \| (\w+) \| (\d+) \|/);
          if (topic) {
            result.topics.push({
              name: topic[2],
              count: parseInt(topic[3]),
              trend: ''
            });
          }
        });
      }
    } else {
      throw new Error('未找到主题分析部分');
    }
    
    // 解析引用分析
    const citationsMatch = content.match(/## 📚 引用分析[\s\S]*?(?=## ✍️|$)/);
    if (citationsMatch) {
      const citations = citationsMatch[0];
      const citationMatch = citations.match(/\| (\d+) \| (https?:\/\/[^|]+) \| ([^|]+) \| (\d+) \|/g);
      
      if (citationMatch) {
        citationMatch.forEach(match => {
          const citation = match.match(/\| (\d+) \| (https?:\/\/[^|]+) \| ([^|]+) \| (\d+) \|/);
          if (citation) {
            result.citations.push({
              source: citation[3],
              count: parseInt(citation[4]),
              url: citation[2]
            });
          }
        });
      }
    } else {
      throw new Error('未找到引用分析部分');
    }
    
    // 解析改进建议
    const suggestionsMatch = content.match(/## 💡 改进建议[\s\S]*?(?=## ⚔️|$)/);
    if (suggestionsMatch) {
      const suggestions = suggestionsMatch[0];
      const suggestionMatch = suggestions.match(/\d+\. ([^—]+) —— 预期提升：(\d+)%；实施难度（1-5）：(\d+)；优先级（1-5）：(\d+)/g);
      
      if (suggestionMatch) {
        suggestionMatch.forEach(match => {
          const suggestion = match.match(/\d+\. ([^—]+) —— 预期提升：(\d+)%；实施难度（1-5）：(\d+)；优先级（1-5）：(\d+)/);
          if (suggestion) {
            const priorityMap = {
              '1': 'low',
              '2': 'low',
              '3': 'medium',
              '4': 'high',
              '5': 'high'
            };
            result.suggestions.push({
              priority: priorityMap[suggestion[4]] || 'medium',
              title: suggestion[1].trim(),
              description: suggestion[1].trim()
            });
          }
        });
      }
    } else {
      throw new Error('未找到改进建议部分');
    }
    
    // 解析竞品品牌分析
    const competitionMatch = content.match(/## ⚔️ 竞品品牌分析[\s\S]*?(?=## 🏷️|$)/);
    if (competitionMatch) {
      const competition = competitionMatch[0];
      const competitorMatch = competition.match(/\| ([^|]+) \| (\d+) \| (\d+) \| ([^|]+) \| (\d+) \|/g);
      
      if (competitorMatch) {
        competitorMatch.forEach(match => {
          const competitor = match.match(/\| ([^|]+) \| (\d+) \| (\d+) \| ([^|]+) \| (\d+) \|/);
          if (competitor) {
            result.competition.competitors.push({
              name: competitor[1],
              strengths: `AI提及次数：${competitor[2]}，可见度得分：${competitor[5]}`,
              weaknesses: ''
            });
          }
        });
      }
    } else {
      throw new Error('未找到竞品品牌分析部分');
    }
    
    // 验证解析结果
    if (!result.overview.summary || 
        result.visibility.overallVisibility === 0 || 
        result.perception.keywords.length === 0 || 
        result.topics.length === 0 || 
        result.citations.length === 0 || 
        result.suggestions.length === 0 || 
        result.competition.competitors.length === 0) {
      throw new Error('解析结果不完整，缺少必要字段');
    }
    
    console.log('geo模板解析完成:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('解析geo模板失败:', error);
    // 返回错误信息，不返回默认值
    return {
      error: {
        module: 'aiService.parseGeoTemplate',
        function: 'parseGeoTemplate',
        message: '解析geo模板失败',
        details: error.message
      }
    };
  }
}

async function performAIAnalysis(brandId, brandInfo, customAgentId = '') {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = customAgentId || process.env.LLM_AGENT || '';

  console.log('=== 开始品牌分析流程 ===');
  console.log(`品牌ID: ${brandId}`);
  console.log(`品牌信息: ${JSON.stringify(brandInfo)}`);
  console.log(`Agent ID: ${agentId}`);
  console.log(`大模型API配置: URL=${llmApiUrl}, Model=${llmModel}`);

  // 验证API配置
  if (!llmApiKey || !llmApiUrl || !llmModel) {
    const error = '大模型API配置未完成，请检查.env文件中的LLM_API_KEY、LLM_API_URL和LLM_MODEL配置';
    console.error('错误:', error);
    return {
      error: {
        module: 'aiService.performAIAnalysis',
        function: 'performAIAnalysis',
        message: error,
        details: 'API配置缺失'
      }
    };
  }

  // 验证品牌信息
  let brand;
  if (brandInfo) {
    brand = brandInfo;
  } else {
    try {
      brand = await brandModel.getBrandById(brandId);
      if (!brand) {
        const error = `品牌 ${brandId} 不存在`;
        console.error('错误:', error);
        return {
          error: {
            module: 'aiService.performAIAnalysis',
            function: 'getBrandById',
            message: error,
            details: '品牌不存在'
          }
        };
      }
    } catch (error) {
      console.error('获取品牌信息失败:', error);
      return {
        error: {
          module: 'aiService.performAIAnalysis',
          function: 'getBrandById',
          message: '获取品牌信息失败',
          details: error.message
        }
      };
    }
  }

  console.log(`开始分析品牌: ${brand.name}`);

  // 分析品牌概览（使用geo模板格式）
  try {
    const overviewPrompt = `请分析"${brand.name}"品牌的整体情况，并按照以下geo模板格式返回结果：

# ${brand.name} GEO 品牌分析报告

## 📊 数据总览
- AI 提及总次数：{{整数}} 次
- 正面情感回答数量：{{整数}} 条
- 中性情感回答数量：{{整数}} 条
- 负面情感回答数量：{{整数}} 条
- 独立引用来源总数：{{整数}} 个
- 分析的 AI 模型数量：{{整数}} 个
- 使用的提示词总数：{{整数}} 个

## 📖 品牌概览
- 成立年份：{{4位数字}}
- 总部所在地：{{城市名}}
- 近30天AI提及次数：{{整数}} 次
- 主要产品/服务数量：{{整数}} 个
- 列举产品/服务名称（最多5个）：{{名称1}}、{{名称2}}、{{名称3}}、{{名称4}}、{{名称5}}

## 📈 品牌可见度
| 模型名称 | 品牌出现次数 | 出现率（%） |
|---------|------------|-----------|
| {{模型1}} | {{整数}} | {{0-100的数字}} |
| {{模型2}} | {{整数}} | {{0-100的数字}} |
| {{模型3}} | {{整数}} | {{0-100的数字}} |
- 综合可见度得分（百分制）：{{0-100的数字}} 分

## 💬 品牌感知
- 情感得分均值（范围 -1 到 1）：{{小数点后两位}}
- 高频情感词表（词:出现次数）：
  - {{词1}}: {{整数}}
  - {{词2}}: {{整数}}
  - {{词3}}: {{整数}}
  - {{词4}}: {{整数}}
  - {{词5}}: {{整数}}

## 🔍 主题分析
| 排名 | 核心主题 | 讨论热度（出现次数） |
|-----|---------|------------------|
| 1 | {{主题名}} | {{整数}} |
| 2 | {{主题名}} | {{整数}} |
| 3 | {{主题名}} | {{整数}} |
| 4 | {{主题名}} | {{整数}} |
| 5 | {{主题名}} | {{整数}} |

## 📚 引用分析
| 排名 | 引用来源 URL | 域名 | 被引用次数 | 占全部引用百分比（%） |
|-----|-------------|------|-----------|------------------|
| 1 | {{URL}} | {{域名}} | {{整数}} | {{0-100的数字}} |
| 2 | {{URL}} | {{域名}} | {{整数}} | {{0-100的数字}} |
| 3 | {{URL}} | {{域名}} | {{整数}} | {{0-100的数字}} |
| 4 | {{URL}} | {{域名}} | {{整数}} | {{0-100的数字}} |
| 5 | {{URL}} | {{域名}} | {{整数}} | {{0-100的数字}} |
- 来源类型统计：
  - 官方网站引用次数：{{整数}} 次
  - 新闻媒体引用次数：{{整数}} 次
  - 百科引用次数：{{整数}} 次
  - 其他引用次数：{{整数}} 次

## ✍️ 提示词列表
1. {{完整提示词文本}}
2. {{完整提示词文本}}
3. {{完整提示词文本}}
4. {{完整提示词文本}}
5. {{完整提示词文本}}

## 🗣️ 答案快照
### 提示词1：{{完整提示词}}
{{AI回答原文，不少于50字}}
### 提示词2：{{完整提示词}}
{{AI回答原文，不少于50字}}

## 💡 改进建议
1. {{建议内容}} —— 预期提升：{{数字}}%；实施难度（1-5）：{{整数}}；优先级（1-5）：{{整数}}
2. {{建议内容}} —— 预期提升：{{数字}}%；实施难度（1-5）：{{整数}}；优先级（1-5）：{{整数}}
3. {{建议内容}} —— 预期提升：{{数字}}%；实施难度（1-5）：{{整数}}；优先级（1-5）：{{整数}}

## ⚔️ 竞品品牌分析
| 竞品名称 | AI提及次数 | 正面率（%） | TOP1引用源 | 可见度得分（0-100） |
|---------|----------|-----------|-----------|------------------|
| {{竞品1}} | {{整数}} | {{0-100的数字}} | {{域名}} | {{0-100的数字}} |
| {{竞品2}} | {{整数}} | {{0-100的数字}} | {{域名}} | {{0-100的数字}} |
| {{竞品3}} | {{整数}} | {{0-100的数字}} | {{域名}} | {{0-100的数字}} |

## 🏷️ 竞品提示词分析
| 提示词 | ${brand.name} | {{竞品1}} | {{竞品2}} | {{竞品3}} |
|-------|-------------|----------|----------|----------|
| {{提示词1}} | {{数字}}次 | {{数字}}次 | {{数字}}次 | {{数字}}次 |
| {{提示词2}} | {{数字}}次 | {{数字}}次 | {{数字}}次 | {{数字}}次 |
| {{提示词3}} | {{数字}}次 | {{数字}}次 | {{数字}}次 | {{数字}}次 |

## 🎛️ 竞品设置
- 本次使用的竞品名单：{{竞品1}}、{{竞品2}}、{{竞品3}}（来源：{{自动识别/用户指定}}）
- 自定义竞品格式：发送 /set_competitors 竞品A,竞品B

品牌信息：
- 品牌名称：${brand.name}
- 品牌网站：${brand.website || '未知'}`;

    console.log('开始调用大模型API:', llmApiUrl);
    
    try {
      const response = await fetch(llmApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmApiKey}`
        },
        body: JSON.stringify({
          model: llmModel,
          agent: agentId || '',
          messages: [
            {
              role: 'system',
              content: '你是品牌分析专家，专注于分析品牌的整体表现。请根据用户提供的品牌信息，进行全面的品牌分析，包括品牌优势、市场机会、竞争分析、风险评估等方面。'
            },
            {
              role: 'user',
              content: overviewPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      console.log('API响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        const error = `品牌概览API调用失败: ${response.status} - ${errorText}`;
        console.error('错误:', error);
        return {
          error: {
            module: 'aiService.performAIAnalysis',
            function: 'fetch',
            message: error,
            details: `HTTP状态码: ${response.status}`
          }
        };
      }

      const responseData = await response.json();
      console.log('API响应数据:', JSON.stringify(responseData, null, 2));
      
      const content = responseData.choices?.[0]?.message?.content;
      if (!content) {
        const error = '大模型返回内容为空';
        console.error('错误:', error);
        return {
          error: {
            module: 'aiService.performAIAnalysis',
            function: 'response processing',
            message: error,
            details: '大模型未返回任何内容'
          }
        };
      }

      // 解析返回内容
      try {
        // 尝试解析为JSON
        const parsedJson = safeJsonParse(content);
        if (!parsedJson.error) {
          console.log('成功解析为JSON格式');
          
          // 验证解析结果
          if (!parsedJson.overview || !parsedJson.visibility || !parsedJson.perception) {
            const error = '解析结果缺少必要字段';
            console.error('错误:', error);
            return {
              error: {
                module: 'aiService.performAIAnalysis',
                function: 'JSON parsing',
                message: error,
                details: '解析结果结构不完整'
              }
            };
          }
          
          return parsedJson;
        } else {
          // 尝试解析为geo模板格式
          console.log('JSON解析失败，尝试解析为geo模板格式');
          const parsedGeo = parseGeoTemplate(content, brand.name);
          
          // 检查解析结果是否包含错误
          if (parsedGeo.error) {
            console.error('geo模板解析失败:', parsedGeo.error);
            return parsedGeo;
          }
          
          // 验证解析结果
          if (!parsedGeo.overview || !parsedGeo.visibility || !parsedGeo.perception) {
            const error = 'geo模板解析结果缺少必要字段';
            console.error('错误:', error);
            return {
              error: {
                module: 'aiService.performAIAnalysis',
                function: 'geo template parsing',
                message: error,
                details: '解析结果结构不完整'
              }
            };
          }
          
          console.log('成功解析为geo模板格式');
          return parsedGeo;
        }
      } catch (parseError) {
        const error = '解析品牌概览结果失败';
        console.error('错误:', error, parseError);
        return {
          error: {
            module: 'aiService.performAIAnalysis',
            function: 'parsing',
            message: error,
            details: parseError.message
          }
        };
      }
    } catch (error) {
      console.error('分析品牌概览失败:', error);
      return {
        error: {
          module: 'aiService.performAIAnalysis',
          function: 'API call',
          message: '分析品牌概览失败',
          details: error.message
        }
      };
    }
  } catch (error) {
    console.error('分析品牌概览失败:', error);
    return {
      error: {
        module: 'aiService.performAIAnalysis',
        function: 'main',
        message: '分析品牌概览失败',
        details: error.message
      }
    };
  }
}

async function performPromptAnalysis(brandId, brandInfo, prompts, customAgentId = '') {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = customAgentId || process.env.LLM_AGENT || '';

  console.log('=== 开始提示词分析流程 ===');
  console.log(`品牌ID: ${brandId}`);
  console.log(`提示词列表: ${JSON.stringify(prompts)}`);
  console.log(`Agent ID: ${agentId}`);
  console.log(`大模型API配置: URL=${llmApiUrl}, Model=${llmModel}`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    const error = '大模型API配置未完成，请检查.env文件中的LLM_API_KEY、LLM_API_URL和LLM_MODEL配置';
    console.error('错误:', error);
    return {
      error: {
        module: 'aiService.performPromptAnalysis',
        function: 'performPromptAnalysis',
        message: error,
        details: 'API配置缺失'
      }
    };
  }

  let brand;
  if (brandInfo) {
    brand = brandInfo;
  } else {
    try {
      brand = await brandModel.getBrandById(brandId);
      if (!brand) {
        const error = `品牌 ${brandId} 不存在`;
        console.error('错误:', error);
        return {
          error: {
            module: 'aiService.performPromptAnalysis',
            function: 'getBrandById',
            message: error,
            details: '品牌不存在'
          }
        };
      }
    } catch (error) {
      console.error('获取品牌信息失败:', error);
      return {
        error: {
          module: 'aiService.performPromptAnalysis',
          function: 'getBrandById',
          message: '获取品牌信息失败',
          details: error.message
        }
      };
    }
  }

  console.log(`开始分析提示词，品牌: ${brand.name}`);

  try {
    const promptList = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n');
    const promptAnalysisRequest = `请分析"${brand.name}"品牌在以下提示词下的表现：

品牌信息：
- 品牌名称：${brand.name}
- 品牌网站：${brand.website || '未知'}

提示词列表：
${promptList}

请对每个提示词进行详细分析，包括：
1. 提示词的预期用途
2. 品牌在该提示词下的表现评估
3. 相关的优化建议

请按照以下JSON格式返回结果：
{
  "promptAnalysis": [
    {
      "prompt": "提示词文本",
      "analysis": "分析结果",
      "suggestions": ["建议1", "建议2"]
    }
  ]
}`;

    console.log('开始调用大模型API进行提示词分析:', llmApiUrl);

    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        agent: agentId || '',
        messages: [
          {
            role: 'system',
            content: '你是品牌分析专家，专注于分析品牌在不同提示词下的表现。'
          },
          {
            role: 'user',
            content: promptAnalysisRequest
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    console.log('API响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      const error = `提示词分析API调用失败: ${response.status} - ${errorText}`;
      console.error('错误:', error);
      return {
        error: {
          module: 'aiService.performPromptAnalysis',
          function: 'fetch',
          message: error,
          details: `HTTP状态码: ${response.status}`
        }
      };
    }

    const responseData = await response.json();
    console.log('API响应数据:', JSON.stringify(responseData, null, 2));

    const content = responseData.choices?.[0]?.message?.content;
    if (!content) {
      const error = '大模型返回内容为空';
      console.error('错误:', error);
      return {
        error: {
          module: 'aiService.performPromptAnalysis',
          function: 'response processing',
          message: error,
          details: '大模型未返回任何内容'
        }
      };
    }

    try {
      const parsedJson = safeJsonParse(content);
      if (!parsedJson.error) {
        console.log('提示词分析完成');
        return parsedJson;
      } else {
        const error = '解析提示词分析结果失败';
        console.error('错误:', error);
        return {
          error: {
            module: 'aiService.performPromptAnalysis',
            function: 'parsing',
            message: error,
            details: parsedJson.error
          }
        };
      }
    } catch (parseError) {
      const error = '解析提示词分析结果失败';
      console.error('错误:', error, parseError);
      return {
        error: {
          module: 'aiService.performPromptAnalysis',
          function: 'parsing',
          message: error,
          details: parseError.message
        }
      };
    }
  } catch (error) {
    console.error('提示词分析失败:', error);
    return {
      error: {
        module: 'aiService.performPromptAnalysis',
        function: 'main',
        message: '提示词分析失败',
        details: error.message
      }
    };
  }
}

async function generateArticle(brandId, brandInfo, articleRequirements, customAgentId = '') {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = customAgentId || process.env.LLM_AGENT || '';

  console.log('=== 开始文章生成流程 ===');
  console.log(`品牌ID: ${brandId}`);
  console.log(`文章需求: ${JSON.stringify(articleRequirements)}`);
  console.log(`Agent ID: ${agentId}`);
  console.log(`大模型API配置: URL=${llmApiUrl}, Model=${llmModel}`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    const error = '大模型API配置未完成，请检查.env文件中的LLM_API_KEY、LLM_API_URL和LLM_MODEL配置';
    console.error('错误:', error);
    return {
      error: {
        module: 'aiService.generateArticle',
        function: 'generateArticle',
        message: error,
        details: 'API配置缺失'
      }
    };
  }

  let brand;
  if (brandInfo) {
    brand = brandInfo;
  } else {
    try {
      brand = await brandModel.getBrandById(brandId);
      if (!brand) {
        const error = `品牌 ${brandId} 不存在`;
        console.error('错误:', error);
        return {
          error: {
            module: 'aiService.generateArticle',
            function: 'getBrandById',
            message: error,
            details: '品牌不存在'
          }
        };
      }
    } catch (error) {
      console.error('获取品牌信息失败:', error);
      return {
        error: {
          module: 'aiService.generateArticle',
          function: 'getBrandById',
          message: '获取品牌信息失败',
          details: error.message
        }
      };
    }
  }

  console.log(`开始生成文章，品牌: ${brand.name}`);

  try {
    const { title, topic, style, length } = articleRequirements;
    const articleRequest = `请为"${brand.name}"品牌生成一篇SEO优化的文章。

品牌信息：
- 品牌名称：${brand.name}
- 品牌网站：${brand.website || '未知'}

文章要求：
- 标题：${title || '未指定'}
- 主题：${topic || '品牌介绍'}
- 风格：${style || '专业'}
- 长度：${length || '中等'}

请生成一篇结构清晰、SEO友好的文章，包含：
1. 吸引人的标题
2. 介绍部分
3. 主体内容（至少3个段落）
4. 总结部分

请直接返回文章内容，不需要额外的格式标记。`;

    console.log('开始调用大模型API生成文章:', llmApiUrl);

    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        agent: agentId || '',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的SEO内容撰写专家，擅长创作高质量、品牌友好的文章。'
          },
          {
            role: 'user',
            content: articleRequest
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    console.log('API响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      const error = `文章生成API调用失败: ${response.status} - ${errorText}`;
      console.error('错误:', error);
      return {
        error: {
          module: 'aiService.generateArticle',
          function: 'fetch',
          message: error,
          details: `HTTP状态码: ${response.status}`
        }
      };
    }

    const responseData = await response.json();
    console.log('API响应数据:', JSON.stringify(responseData, null, 2));

    const content = responseData.choices?.[0]?.message?.content;
    if (!content) {
      const error = '大模型返回内容为空';
      console.error('错误:', error);
      return {
        error: {
          module: 'aiService.generateArticle',
          function: 'response processing',
          message: error,
          details: '大模型未返回任何内容'
        }
      };
    }

    console.log('文章生成完成');
    return {
      article: content,
      title: title || '未命名文章',
      brand: brand.name,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('文章生成失败:', error);
    return {
      error: {
        module: 'aiService.generateArticle',
        function: 'main',
        message: '文章生成失败',
        details: error.message
      }
    };
  }
}

async function aiChat(question, context = {}, customAgentId = '') {
  const llmApiKey = process.env.LLM_API_KEY;
  const llmApiUrl = process.env.LLM_API_URL;
  const llmModel = process.env.LLM_MODEL;
  const agentId = customAgentId || process.env.LLM_AGENT || '';

  console.log('=== 开始AI对话 ===');
  console.log(`问题: ${question}`);
  console.log(`上下文: ${JSON.stringify(context)}`);
  console.log(`Agent ID: ${agentId}`);
  console.log(`大模型API配置: URL=${llmApiUrl}, Model=${llmModel}`);

  if (!llmApiKey || !llmApiUrl || !llmModel) {
    const error = '大模型API配置未完成，请检查.env文件中的LLM_API_KEY、LLM_API_URL和LLM_MODEL配置';
    console.error('错误:', error);
    return {
      error: {
        module: 'aiService.aiChat',
        function: 'aiChat',
        message: error,
        details: 'API配置缺失'
      }
    };
  }

  try {
    const contextInfo = Object.keys(context).length > 0
      ? `\n上下文信息：\n${Object.entries(context).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
      : '';

    const chatRequest = `${question}${contextInfo}`;

    console.log('开始调用大模型API进行对话:', llmApiUrl);

    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: llmModel,
        agent: agentId || '',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的AI助手，可以回答用户的问题并提供有用的建议。'
          },
          {
            role: 'user',
            content: chatRequest
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    console.log('API响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      const error = `AI对话API调用失败: ${response.status} - ${errorText}`;
      console.error('错误:', error);
      return {
        error: {
          module: 'aiService.aiChat',
          function: 'fetch',
          message: error,
          details: `HTTP状态码: ${response.status}`
        }
      };
    }

    const responseData = await response.json();
    console.log('API响应数据:', JSON.stringify(responseData, null, 2));

    const content = responseData.choices?.[0]?.message?.content;
    if (!content) {
      const error = '大模型返回内容为空';
      console.error('错误:', error);
      return {
        error: {
          module: 'aiService.aiChat',
          function: 'response processing',
          message: error,
          details: '大模型未返回任何内容'
        }
      };
    }

    console.log('AI对话完成');
    return {
      answer: content,
      question: question,
      context: context,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('AI对话失败:', error);
    return {
      error: {
        module: 'aiService.aiChat',
        function: 'main',
        message: 'AI对话失败',
        details: error.message
      }
    };
  }
}


module.exports = {
  performAIAnalysis,
  performPromptAnalysis,
  generateArticle,
  aiChat
};