/**
 * 提示词服务模块
 * @module services/promptService
 * @description 提供提示词生成和管理功能
 */

/**
 * 生成品牌提示词建议
 * @param {string} brandName - 品牌名称
 * @param {string} [industry] - 所属行业
 * @returns {Array<{text: string, category: string}>} 提示词建议列表
 */
function generatePromptSuggestions(brandName, industry) {
  const basePrompts = [
    { text: `${brandName}品牌在AI平台的提及情况`, category: '品牌提及' },
    { text: `${brandName}的核心功能介绍`, category: '产品功能' },
    { text: `${brandName}与竞品的对比分析`, category: '竞品对比' },
    { text: `用户对${brandName}的评价和反馈`, category: '用户评价' },
    { text: `${brandName}在${industry || '相关'}领域的优势`, category: '行业地位' },
    { text: `${brandName}的市场定位和目标用户`, category: '市场定位' },
    { text: `${brandName}的定价策略和商业模式`, category: '商业模式' },
    { text: `${brandName}的技术架构和实现原理`, category: '技术分析' },
    { text: `${brandName}的发展历程和里程碑`, category: '发展历程' },
    { text: `${brandName}的发展趋势和规划`, category: '未来趋势' }
  ];
  return basePrompts;
}

/**
 * 从描述中提取行业信息
 * @param {string} [description] - 品牌描述
 * @returns {string} 行业名称
 */
function extractIndustry(description) {
  if (!description) {
    return '未知';
  }

  const industryKeywords = ['软件', '电商', '教育', '金融', '医疗', '科技', '互联网', 'AI', 'GEO', '营销', '广告'];

  for (const keyword of industryKeywords) {
    if (description.includes(keyword)) {
      return keyword;
    }
  }

  return '未知';
}

module.exports = {
  generatePromptSuggestions,
  extractIndustry
};
