/**
 * GEO品牌分析报告解析器 - 浏览器端版本
 * @description 用于在浏览器中解析AI返回的GEO品牌分析报告模板数据
 */

if (typeof window !== 'undefined') {
  window.GEOParser = (function() {
    /**
     * 解析结果结构
     * @typedef {Object} ParseResult
     * @property {boolean} success - 解析是否成功
     * @property {Object} data - 解析后的数据
     * @property {string[]} errors - 错误信息列表
     * @property {string[]} warnings - 警告信息列表
     */

    /**
     * 从文本中提取匹配的值
     * @param {string} text - 原始文本
     * @param {RegExp} regex - 匹配正则表达式
     * @param {string} defaultValue - 默认值
     * @returns {string} 提取的值
     */
    function extractValue(text, regex, defaultValue = '') {
      const match = text.match(regex);
      return match ? match[1].trim() : defaultValue;
    }

    /**
     * 提取指定板块的内容
     * @param {string} text - 原始文本
     * @param {string} startMarker - 开始标记
     * @param {string} endMarker - 结束标记
     * @returns {string} 板块内容
     */
    function extractSection(text, startMarker, endMarker) {
      const startIndex = text.indexOf(startMarker);
      if (startIndex === -1) return '';
      
      const startContentIndex = text.indexOf('\n', startIndex) + 1;
      const endIndex = text.indexOf(endMarker, startContentIndex);
      
      if (endIndex === -1) {
        return text.substring(startContentIndex);
      }
      return text.substring(startContentIndex, endIndex);
    }

    /**
     * 解析数据总览
     * @param {string} text - 原始文本
     * @returns {Object} 数据总览对象
     */
    function parseDataOverview(text) {
      const overviewSection = extractSection(text, '板块 1：数据总览', '板块 2：');
      
      return {
        updateTime: extractValue(overviewSection, /数据更新时间.*\| ([^\|]+)/),
        aiPlatformCount: parseInt(extractValue(overviewSection, /覆盖 AI 平台数.*\| (\d+)/)) || 0,
        queryCount: parseInt(extractValue(overviewSection, /执行查询总数.*\| (\d+)/)) || 0,
        brandMentionRate: parseFloat(extractValue(overviewSection, /平均品牌提及率.*\| ([\d.]+)%/)) || 0,
        positiveSentimentRate: parseFloat(extractValue(overviewSection, /平均正面情感占比.*\| ([\d.]+)%/)) || 0,
        officialCitationRate: parseFloat(extractValue(overviewSection, /官网引用率.*\| ([\d.]+)%/)) || 0,
        dataSourceNote: extractValue(overviewSection, /数据来源说明.*\| ([^\n]+)/)
      };
    }

    /**
     * 解析AI平台可见度数据
     * @param {string} text - 原始文本
     * @returns {Array} AI平台可见度列表
     */
    function parseAIPlatformVisibility(text) {
      const section = extractSection(text, '板块 2：品牌 AI 可见度', '## 板块 3：');
      const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
      
      const data = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
        
        if (parts.length >= 4) {
          const mentionPart = parts[1];
          const [mentionCount, totalQueries] = mentionPart.split('/').map(v => parseInt(v) || 0);
          
          data.push({
            platform: parts[0],
            mentionCount,
            totalQueries,
            mentionRate: parseFloat(parts[2]) || 0,
            remark: parts[3] || ''
          });
        }
      }
      return data;
    }

    /**
     * 解析官方自我定位
     * @param {string} text - 原始文本
     * @returns {Object} 官方定位对象
     */
    function parseOfficialPositioning(text) {
      const section = extractSection(text, '### 3.1 官方自我定位', '### 3.2');
      
      return {
        source: extractValue(section, /来源：([^\n]+)/),
        mission: extractValue(section, /- 企业使命：([^\n]+)/),
        coreBusiness: extractValue(section, /- 核心业务：([^\n]+)/),
        userScale: extractValue(section, /- 用户规模：([^\n]+)/),
        brandUpgrade: extractValue(section, /- 品牌升级：([^\n]+)/)
      };
    }

    /**
     * 解析高频关键词
     * @param {string} text - 原始文本
     * @returns {Array} 关键词列表
     */
    function parseKeywords(text) {
      const section = extractSection(text, '### 3.2 AI 平台视角下的品牌', '### 3.3');
      const rows = section.match(/\| [^\|]+\| [^\|]+\|/g) || [];
      
      const keywords = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
        
        if (parts.length >= 2) {
          keywords.push({
            keyword: parts[0],
            frequency: parseInt(parts[1].replace('次', '')) || 0
          });
        }
      }
      return keywords;
    }

    /**
     * 解析品牌认知差异
     * @param {string} text - 原始文本
     * @returns {string[]} 差异列表
     */
    function parsePerceptionDifferences(text) {
      const section = extractSection(text, '### 3.3 AI 与传统品牌认知差异', '## 板块 4：');
      const matches = section.match(/\d+\.\s*([^\n]+)/g) || [];
      return matches.map(m => m.replace(/^\d+\.\s*/, '').trim());
    }

    /**
     * 解析搜索联想词
     * @param {string} text - 原始文本
     * @returns {Array} 联想词列表
     */
    function parseSearchAssociations(text) {
      const section = extractSection(text, '### 4.1 搜索联想词', '### 4.2');
      const rows = section.match(/\| [^\|]+\| [^\|]+\|/g) || [];
      
      const associations = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
        
        if (parts.length >= 2) {
          associations.push({
            type: parts[0],
            example: parts[1]
          });
        }
      }
      return associations;
    }

    /**
     * 解析首页占有率
     * @param {string} text - 原始文本
     * @returns {Object} 占有率数据
     */
    function parseHomeShare(text) {
      const section = extractSection(text, '### 4.2 搜索首页占有率', '## 板块 5：');
      
      return {
        brand: parseFloat(extractValue(section, /品牌词.*首页占有率：([\d.]+)%/)) || 0,
        service: parseFloat(extractValue(section, /.*\+服务.*相关词：([\d.]+)%/)) || 0,
        competition: parseFloat(extractValue(section, /.*\+竞争.*类词：([\d.]+)%/)) || 0
      };
    }

    /**
     * 解析情感分布
     * @param {string} text - 原始文本
     * @returns {Object} 情感分布数据
     */
    function parseSentimentDistribution(text) {
      const section = extractSection(text, '### 5.1 整体情感分布', '### 5.2');
      const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
      
      const distribution = {
        positive: 0,
        neutral: 0,
        negative: 0,
        positiveChange: '',
        neutralChange: '',
        negativeChange: ''
      };
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
        
        if (parts.length >= 3) {
          const type = parts[0];
          const percentage = parseFloat(parts[1].replace('%', '')) || 0;
          const change = parts[2];
          
          if (type.includes('正面')) {
            distribution.positive = percentage;
            distribution.positiveChange = change;
          } else if (type.includes('中立') || type.includes('混合')) {
            distribution.neutral = percentage;
            distribution.neutralChange = change;
          } else if (type.includes('负面')) {
            distribution.negative = percentage;
            distribution.negativeChange = change;
          }
        }
      }
      return distribution;
    }

    /**
     * 解析主题分析
     * @param {string} text - 原始文本
     * @returns {Array} 主题列表
     */
    function parseTopics(text) {
      const section = extractSection(text, '## 板块 6：主题分析', '## 板块 7：');
      const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
      
      const topics = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
        
        if (parts.length >= 3) {
          topics.push({
            rank: parseInt(parts[0]) || 0,
            topic: parts[1],
            coOccurrenceRate: parseFloat(parts[2].replace('%', '')) || 0
          });
        }
      }
      return topics;
    }

    /**
     * 解析引用来源
     * @param {string} text - 原始文本
     * @returns {Array} 来源列表
     */
    function parseCitationSources(text) {
      const section = extractSection(text, '### 7.1 来源分类统计', '### 7.2');
      const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
      
      const sources = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
        
        if (parts.length >= 3) {
          sources.push({
            type: parts[0],
            percentage: parseFloat(parts[1].replace('%', '')) || 0,
            representative: parts[2]
          });
        }
      }
      return sources;
    }

    /**
     * 解析提示词列表
     * @param {string} text - 原始文本
     * @returns {Array} 提示词列表
     */
    function parsePrompts(text) {
      const section = extractSection(text, '## 板块 8：提示词列表', '## 板块 9：');
      const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
      
      const prompts = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
        
        if (parts.length >= 3) {
          prompts.push({
            queryType: parts[0],
            question: parts[1],
            summary: parts[2]
          });
        }
      }
      return prompts;
    }

    /**
     * 解析竞品分析
     * @param {string} text - 原始文本
     * @returns {Array} 竞品列表
     */
    function parseCompetitors(text) {
      const section = extractSection(text, '### 10.1 竞品设置说明', '### 10.3');
      const rows = section.match(/\| [^\|]+\| [^\|]+\|/g) || [];
      
      const competitors = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
        
        if (parts.length >= 2) {
          competitors.push({
            competitor: parts[0],
            basis: parts[1],
            marketShare: 0,
            sentimentRate: 0,
            aiMentionRate: 0,
            officialCitationRate: 0,
            coreStrategy: '',
            aiRelation: ''
          });
        }
      }
      
      const analysisSection = extractSection(text, '### 10.2 竞品品牌分析表', '### 10.3');
      const analysisRows = analysisSection.match(/\| [^\|]+\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
      
      if (analysisRows.length > 1) {
        for (let i = 1; i < analysisRows.length; i++) {
          const row = analysisRows[i];
          const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
          
          if (parts.length >= 4) {
            const index = i - 1;
            if (index < competitors.length) {
              competitors[index].marketShare = parseFloat(parts[1].replace('%', '')) || 0;
              competitors[index].sentimentRate = parseFloat(parts[2].replace('%', '')) || 0;
              competitors[index].aiMentionRate = parseFloat(parts[3].replace('%', '')) || 0;
            }
          }
        }
      }
      
      return competitors;
    }

    /**
     * 解析改进建议
     * @param {string} text - 原始文本
     * @returns {Array} 建议列表
     */
    function parseSuggestions(text) {
      const section = extractSection(text, '### 10.4 SEO / GEO 改进建议', '');
      const rows = section.match(/\| [^\|]+\| [^\|]+\| [^\|]+\|/g) || [];
      
      const suggestions = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const parts = row.split('|').map(p => p.trim()).filter(p => p !== '');
        
        if (parts.length >= 3) {
          suggestions.push({
            action: parts[0],
            expectedEffect: parts[1],
            priority: parts[2]
          });
        }
      }
      return suggestions;
    }

    /**
     * 验证解析数据的完整性
     * @param {Object} data - 解析后的数据
     * @returns {{valid: boolean, errors: string[], warnings: string[]}}
     */
    function validateReport(data) {
      const errors = [];
      const warnings = [];
      
      if (!data) {
        errors.push('数据对象为空');
        return { valid: false, errors, warnings };
      }
      
      if (!data.brandName) {
        errors.push('品牌名称不能为空');
      }
      
      if (!data.officialWebsite) {
        warnings.push('官网URL为空');
      }
      
      const checkPercentage = (value, fieldName) => {
        if (value < 0 || value > 100) {
          warnings.push(`${fieldName} 值 ${value}% 超出有效范围(0-100)`);
        }
      };
      
      if (data.overview) {
        checkPercentage(data.overview.brandMentionRate, '品牌提及率');
        checkPercentage(data.overview.positiveSentimentRate, '正面情感占比');
        checkPercentage(data.overview.officialCitationRate, '官网引用率');
      }
      
      if (data.sentimentDistribution) {
        const total = data.sentimentDistribution.positive + 
                      data.sentimentDistribution.neutral + 
                      data.sentimentDistribution.negative;
        if (Math.abs(total - 100) > 5) {
          warnings.push(`情感分布总和(${total}%)与100%偏差较大`);
        }
      }
      
      return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 解析GEO报告主函数
     * @param {string} rawText - AI返回的原始文本数据
     * @returns {ParseResult} 解析结果
     */
    function parse(rawText) {
      const result = {
        success: false,
        data: null,
        errors: [],
        warnings: []
      };

      try {
        if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
          result.errors.push('错误：输入文本为空');
          return result;
        }

        const report = {};
        const text = rawText.trim();

        report.brandName = extractValue(text, /品牌名称：([^\n]+)/);
        report.officialWebsite = extractValue(text, /官方网站：([^\n]+)/);
        report.overview = parseDataOverview(text);
        report.aiVisibility = parseAIPlatformVisibility(text);
        report.visibilityNote = extractValue(text, /⚠️ \*\*说明\*\*：([^\n]+)/);
        report.visibilityCoreFinding = extractValue(text, /\*\*核心发现\*\*：([^\n]+)/);
        report.officialPositioning = parseOfficialPositioning(text);
        report.keywords = parseKeywords(text);
        report.perceptionDifferences = parsePerceptionDifferences(text);
        report.searchAssociations = parseSearchAssociations(text);
        
        const shareResult = parseHomeShare(text);
        report.brandHomeShare = shareResult.brand;
        report.serviceHomeShare = shareResult.service;
        report.competitionHomeShare = shareResult.competition;
        
        report.sentimentDistribution = parseSentimentDistribution(text);
        report.topics = parseTopics(text);
        report.citationSources = parseCitationSources(text);
        report.prompts = parsePrompts(text);
        report.competitors = parseCompetitors(text);
        report.suggestions = parseSuggestions(text);

        if (!report.brandName) {
          result.errors.push('错误：未能解析品牌名称');
        }

        result.data = report;
        result.success = result.errors.length === 0;

        return result;
      } catch (error) {
        result.errors.push(`解析过程发生异常：${error.message}`);
        return result;
      }
    }

    /**
     * 将解析数据填充到DOM
     * @param {Object} data - 解析数据
     * @param {Object} mapping - 字段映射配置
     */
    function populateToDOM(data, mapping) {
      const defaultMapping = {
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
        topics: { container: '#topicsContainer' },
        suggestions: { container: '#suggestionsContainer' }
      };

      const config = mapping || defaultMapping;

      if (data.overview) {
        Object.keys(config.overview).forEach(key => {
          const selector = config.overview[key];
          const element = document.querySelector(selector);
          if (element) {
            element.textContent = data.overview[key] !== undefined ? data.overview[key] : '--';
          }
        });
      }

      if (data.sentimentDistribution) {
        const sentiment = data.sentimentDistribution;
        const positiveEl = document.querySelector(config.sentiment.positive);
        const neutralEl = document.querySelector(config.sentiment.neutral);
        const negativeEl = document.querySelector(config.sentiment.negative);
        
        if (positiveEl) {
          positiveEl.textContent = `${sentiment.positive}%`;
          positiveEl.style.width = `${sentiment.positive}%`;
        }
        if (neutralEl) {
          neutralEl.textContent = `${sentiment.neutral}%`;
          neutralEl.style.width = `${sentiment.neutral}%`;
        }
        if (negativeEl) {
          negativeEl.textContent = `${sentiment.negative}%`;
          negativeEl.style.width = `${sentiment.negative}%`;
        }
      }

      if (data.topics && data.topics.length > 0) {
        const container = document.querySelector(config.topics.container);
        if (container) {
          container.innerHTML = data.topics.slice(0, 5).map(item => 
            `<div class="topic-item">
              <span class="topic-rank">${item.rank}</span>
              <span class="topic-name">${item.topic}</span>
              <span class="topic-rate">${item.coOccurrenceRate}%</span>
            </div>`
          ).join('');
        }
      }

      if (data.suggestions && data.suggestions.length > 0) {
        const container = document.querySelector(config.suggestions.container);
        if (container) {
          const priorityColors = { 'P0': '#ef4444', 'P1': '#f59e0b', 'P2': '#22c55e' };
          container.innerHTML = data.suggestions.map(item => {
            const color = priorityColors[item.priority] || '#666';
            return `
              <div class="suggestion-item">
                <span class="priority-badge" style="background: ${color}">${item.priority}</span>
                <div class="suggestion-content">
                  <div class="suggestion-action">${item.action}</div>
                  <div class="suggestion-effect">预期效果：${item.expectedEffect}</div>
                </div>
              </div>`;
          }).join('');
        }
      }
    }

    return {
      parse: parse,
      validate: validateReport,
      populateToDOM: populateToDOM,
      version: '1.0.0'
    };
  })();
}
