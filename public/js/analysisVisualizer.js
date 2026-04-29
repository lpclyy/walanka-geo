/**
 * 品牌分析可视化组件
 * @description 提供品牌分析数据的图表展示功能
 */

if (typeof window !== 'undefined') {
  window.AnalysisVisualizer = (function() {
    /**
     * 创建AI平台可见度柱状图
     * @param {string} containerId - 容器ID
     * @param {Array} platforms - 平台数据数组
     */
    function createAIPlatformChart(containerId, platforms) {
      if (!window.echarts) {
        console.error('ECharts未加载');
        return;
      }

      const container = document.getElementById(containerId);
      if (!container) return;

      const chart = window.echarts.init(container);
      const option = {
        title: { text: 'AI平台可见度分布', left: 'center', textStyle: { fontSize: 14, fontWeight: 'bold' } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['提及率'], bottom: 10 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: platforms.map(p => p.name),
          axisLabel: { rotate: 45, fontSize: 11 }
        },
        yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
        series: [{
          name: '提及率',
          type: 'bar',
          data: platforms.map(p => p.visibility),
          barWidth: '60%',
          itemStyle: {
            color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#0d9488' },
              { offset: 1, color: '#14b8a6' }
            ]),
            borderRadius: [4, 4, 0, 0]
          }
        }]
      };

      chart.setOption(option);
      window.addEventListener('resize', () => chart.resize());
      return chart;
    }

    /**
     * 创建情感分布饼图
     * @param {string} containerId - 容器ID
     * @param {Object} sentiment - 情感数据
     */
    function createSentimentChart(containerId, sentiment) {
      if (!window.echarts) {
        console.error('ECharts未加载');
        return;
      }

      const container = document.getElementById(containerId);
      if (!container) return;

      const chart = window.echarts.init(container);
      const option = {
        title: { text: '情感分布', left: 'center', textStyle: { fontSize: 14, fontWeight: 'bold' } },
        tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
        legend: { orient: 'vertical', left: 'left' },
        series: [{
          name: '情感分布',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}: {c}%' },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
          data: [
            { value: sentiment.positive || 0, name: '正面', itemStyle: { color: '#22c55e' } },
            { value: sentiment.neutral || 0, name: '中立', itemStyle: { color: '#f59e0b' } },
            { value: sentiment.negative || 0, name: '负面', itemStyle: { color: '#ef4444' } }
          ]
        }]
      };

      chart.setOption(option);
      window.addEventListener('resize', () => chart.resize());
      return chart;
    }

    /**
     * 创建主题分析横向柱状图
     * @param {string} containerId - 容器ID
     * @param {Array} topics - 主题数据数组
     */
    function createTopicChart(containerId, topics) {
      if (!window.echarts) {
        console.error('ECharts未加载');
        return;
      }

      const container = document.getElementById(containerId);
      if (!container) return;

      const chart = window.echarts.init(container);
      const option = {
        title: { text: '核心关联主题', left: 'center', textStyle: { fontSize: 14, fontWeight: 'bold' } },
        tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
        yAxis: { type: 'category', data: topics.map(t => t.topic).reverse() },
        series: [{
          name: '共现率',
          type: 'bar',
          data: topics.map(t => t.coOccurrenceRate).reverse(),
          barWidth: '50%',
          itemStyle: {
            color: new window.echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#8b5cf6' }
            ]),
            borderRadius: [0, 4, 4, 0]
          }
        }]
      };

      chart.setOption(option);
      window.addEventListener('resize', () => chart.resize());
      return chart;
    }

    /**
     * 创建竞品对比图表
     * @param {string} containerId - 容器ID
     * @param {Array} competitors - 竞品数据数组
     * @param {string} brandName - 当前品牌名称
     */
    function createCompetitorChart(containerId, competitors, brandName) {
      if (!window.echarts) {
        console.error('ECharts未加载');
        return;
      }

      const container = document.getElementById(containerId);
      if (!container) return;

      const chart = window.echarts.init(container);
      const option = {
        title: { text: '竞品对比分析', left: 'center', textStyle: { fontSize: 14, fontWeight: 'bold' } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross', crossStyle: { color: '#999' } } },
        legend: { data: ['市场份额', '情感正面率', 'AI提及率'], bottom: 10 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: [{ type: 'category', data: [brandName, ...competitors.map(c => c.name)] }],
        yAxis: [{ type: 'value', max: 100, axisLabel: { formatter: '{value}%' } }],
        series: [
          { name: '市场份额', type: 'bar', data: [0, ...competitors.map(c => c.marketShare)], itemStyle: { color: '#0d9488' } },
          { name: '情感正面率', type: 'bar', data: [0, ...competitors.map(c => c.sentimentRate)], itemStyle: { color: '#3b82f6' } },
          { name: 'AI提及率', type: 'bar', data: [0, ...competitors.map(c => c.aiMentionRate)], itemStyle: { color: '#f59e0b' } }
        ]
      };

      chart.setOption(option);
      window.addEventListener('resize', () => chart.resize());
      return chart;
    }

    /**
     * 创建引用来源饼图
     * @param {string} containerId - 容器ID
     * @param {Array} citations - 引用数据数组
     */
    function createCitationChart(containerId, citations) {
      if (!window.echarts) {
        console.error('ECharts未加载');
        return;
      }

      const container = document.getElementById(containerId);
      if (!container) return;

      const chart = window.echarts.init(container);
      const option = {
        title: { text: '引用来源分布', left: 'center', textStyle: { fontSize: 14, fontWeight: 'bold' } },
        tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
        legend: { bottom: 10, orient: 'horizontal' },
        series: [{
          name: '引用来源',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '40%'],
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}\n{c}次' },
          data: citations.map((c, i) => ({
            value: c.count || 0,
            name: c.source || `来源${i + 1}`,
            itemStyle: { color: getColorByIndex(i) }
          }))
        }]
      };

      chart.setOption(option);
      window.addEventListener('resize', () => chart.resize());
      return chart;
    }

    /**
     * 获取颜色
     * @param {number} index - 索引
     * @returns {string} 颜色值
     */
    function getColorByIndex(index) {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
      return colors[index % colors.length];
    }

    /**
     * 创建仪表盘图
     * @param {string} containerId - 容器ID
     * @param {number} value - 数值
     * @param {string} title - 标题
     */
    function createGaugeChart(containerId, value, title) {
      if (!window.echarts) {
        console.error('ECharts未加载');
        return;
      }

      const container = document.getElementById(containerId);
      if (!container) return;

      const chart = window.echarts.init(container);
      const option = {
        series: [{
          type: 'gauge',
          radius: '100%',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          splitNumber: 10,
          axisLine: {
            lineStyle: {
              width: 12,
              color: [[0.3, '#22c55e'], [0.7, '#f59e0b'], [1, '#ef4444']]
            }
          },
          pointer: { itemStyle: { color: '#333' }, length: '60%', width: 4 },
          axisTick: { distance: -20, length: 8, lineStyle: { color: '#999', width: 2 } },
          splitLine: { distance: -25, length: 20, lineStyle: { color: '#999', width: 3 } },
          axisLabel: { color: '#999', distance: 30, fontSize: 12 },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: '#333',
            fontSize: 24,
            offsetCenter: [0, '70%']
          },
          data: [{ value: value || 0, name: title, title: { offsetCenter: [0, '90%'], fontSize: 12, color: '#666' } }]
        }]
      };

      chart.setOption(option);
      window.addEventListener('resize', () => chart.resize());
      return chart;
    }

    /**
     * 渲染KPI卡片
     * @param {string} containerId - 容器ID
     * @param {Object} data - KPI数据
     */
    function renderKPICards(containerId, data) {
      const container = document.getElementById(containerId);
      if (!container || !data) return;

      const cards = [
        { key: 'brandMentionRate', label: '品牌提及率', unit: '%', color: '#0d9488' },
        { key: 'positiveSentimentRate', label: '正面情感占比', unit: '%', color: '#22c55e' },
        { key: 'officialCitationRate', label: '官网引用率', unit: '%', color: '#3b82f6' },
        { key: 'aiPlatformCount', label: '覆盖平台数', unit: '个', color: '#8b5cf6' },
        { key: 'queryCount', label: '查询总数', unit: '次', color: '#f59e0b' },
        { key: 'overallScore', label: '综合评分', unit: '分', color: '#ec4899' }
      ];

      container.innerHTML = cards.map(card => {
        const value = data[card.key] ?? '--';
        const displayValue = typeof value === 'number' ? value + card.unit : value;
        return `
          <div class="kpi-card" style="border-left: 4px solid ${card.color};">
            <div class="kpi-label">${card.label}</div>
            <div class="kpi-value" style="color: ${card.color};">${displayValue}</div>
          </div>
        `;
      }).join('');
    }

    /**
     * 渲染改进建议列表
     * @param {string} containerId - 容器ID
     * @param {Array} suggestions - 建议列表
     */
    function renderSuggestions(containerId, suggestions) {
      const container = document.getElementById(containerId);
      if (!container) return;

      if (!suggestions || suggestions.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无改进建议</div>';
        return;
      }

      const priorityColors = { 'P0': '#ef4444', 'P1': '#f59e0b', 'P2': '#22c55e' };
      const priorityLabels = { 'P0': '紧急', 'P1': '重要', 'P2': '一般' };

      container.innerHTML = suggestions.map(suggestion => {
        const color = priorityColors[suggestion.priority] || '#666';
        const label = priorityLabels[suggestion.priority] || suggestion.priority;
        return `
          <div class="suggestion-item">
            <span class="priority-badge" style="background: ${color}">${label}</span>
            <div class="suggestion-content">
              <div class="suggestion-title">${suggestion.title}</div>
              <div class="suggestion-desc">${suggestion.description}</div>
              <div class="suggestion-meta">
                <span>预期提升: ${suggestion.expectedEffect}%</span>
                <span>难度: ${suggestion.difficulty}/5</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    /**
     * 渲染关键词云
     * @param {string} containerId - 容器ID
     * @param {Array} keywords - 关键词数组
     */
    function renderKeywordCloud(containerId, keywords) {
      const container = document.getElementById(containerId);
      if (!container) return;

      if (!keywords || keywords.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无关键词数据</div>';
        return;
      }

      const maxFreq = Math.max(...keywords.map(k => k.frequency || 1));
      const colors = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

      container.innerHTML = keywords.map((keyword, index) => {
        const freq = keyword.frequency || 1;
        const size = 14 + (freq / maxFreq) * 16;
        const color = colors[index % colors.length];
        return `<span class="keyword-tag" style="font-size: ${size}px; color: ${color};">${keyword.keyword}</span>`;
      }).join(' ');
    }

    /**
     * 渲染分析摘要
     * @param {string} containerId - 容器ID
     * @param {string} summary - 摘要文本
     */
    function renderSummary(containerId, summary) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.textContent = summary || '暂无分析摘要';
    }

    /**
     * 渲染数据更新时间
     * @param {string} containerId - 容器ID
     * @param {string} time - 更新时间
     */
    function renderUpdateTime(containerId, time) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.textContent = time || '未分析';
    }

    /**
     * 初始化所有图表
     * @param {Object} analysisData - 分析数据
     */
    function initCharts(analysisData) {
      if (!analysisData) return;

      // 渲染KPI卡片
      renderKPICards('kpiContainer', {
        ...(analysisData.overview || {}),
        overallScore: analysisData.overallScore
      });

      // 渲染摘要
      renderSummary('summaryContainer', analysisData.summary);

      // 渲染更新时间
      renderUpdateTime('updateTimeContainer', analysisData.overview?.updateTime);

      // 创建图表
      if (analysisData.visibility?.platforms && analysisData.visibility.platforms.length > 0) {
        createAIPlatformChart('aiPlatformChart', analysisData.visibility.platforms);
      }

      if (analysisData.perception) {
        createSentimentChart('sentimentChart', analysisData.perception);
        renderKeywordCloud('keywordCloud', analysisData.perception.keywords);
      }

      if (analysisData.topics && analysisData.topics.length > 0) {
        createTopicChart('topicChart', analysisData.topics);
      }

      if (analysisData.citations && analysisData.citations.length > 0) {
        createCitationChart('citationChart', analysisData.citations);
      }

      if (analysisData.competition?.competitors && analysisData.competition.competitors.length > 0) {
        createCompetitorChart('competitorChart', analysisData.competition.competitors, analysisData.overview?.brandName);
      }

      if (analysisData.suggestions && analysisData.suggestions.length > 0) {
        renderSuggestions('suggestionsContainer', analysisData.suggestions);
      }

      // 创建仪表盘
      if (analysisData.overview?.brandMentionRate !== undefined) {
        createGaugeChart('gaugeChart', analysisData.overview.brandMentionRate, '品牌提及率');
      }
    }

    /**
     * 加载并渲染分析数据
     * @param {number} brandId - 品牌ID
     */
    async function loadAndRenderAnalysis(brandId) {
      try {
        const response = await fetch(`/api/user-brands/${brandId}/analysis`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) {
          throw new Error('获取分析数据失败');
        }

        const data = await response.json();
        if (data.data) {
          initCharts(data.data);
        }
      } catch (error) {
        console.error('加载分析数据失败:', error);
      }
    }

    return {
      initCharts,
      loadAndRenderAnalysis,
      createAIPlatformChart,
      createSentimentChart,
      createTopicChart,
      createCompetitorChart,
      createCitationChart,
      createGaugeChart,
      renderKPICards,
      renderSuggestions,
      renderKeywordCloud
    };
  })();
}
