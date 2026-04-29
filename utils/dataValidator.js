/**
 * 数据验证器模块
 * @module utils/dataValidator
 * @description 提供数据验证和类型转换功能，确保模板中数字类型占位符的正确处理
 */

/**
 * 验证并转换整数
 * @param {*} value - 待验证的值
 * @param {Object} options - 验证选项
 * @param {number} [options.min] - 最小值
 * @param {number} [options.max] - 最大值
 * @param {number} [options.default] - 默认值
 * @returns {{valid: boolean, value: number, error: string}}
 */
function validateInteger(value, options = {}) {
  const result = { valid: true, value: options.default || 0, error: '' };
  
  if (value === null || value === undefined || value === '' || value === '--') {
    return result;
  }
  
  const numValue = parseInt(value, 10);
  
  if (isNaN(numValue)) {
    result.valid = false;
    result.error = `值 "${value}" 不是有效的整数`;
    return result;
  }
  
  if (options.min !== undefined && numValue < options.min) {
    result.valid = false;
    result.error = `值 ${numValue} 小于最小值 ${options.min}`;
    return result;
  }
  
  if (options.max !== undefined && numValue > options.max) {
    result.valid = false;
    result.error = `值 ${numValue} 大于最大值 ${options.max}`;
    return result;
  }
  
  result.value = numValue;
  return result;
}

/**
 * 验证并转换浮点数
 * @param {*} value - 待验证的值
 * @param {Object} options - 验证选项
 * @param {number} [options.min] - 最小值
 * @param {number} [options.max] - 最大值
 * @param {number} [options.decimals] - 小数位数
 * @param {number} [options.default] - 默认值
 * @returns {{valid: boolean, value: number, error: string}}
 */
function validateFloat(value, options = {}) {
  const result = { valid: true, value: options.default || 0.0, error: '' };
  
  if (value === null || value === undefined || value === '' || value === '--') {
    return result;
  }
  
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    result.valid = false;
    result.error = `值 "${value}" 不是有效的数字`;
    return result;
  }
  
  if (options.min !== undefined && numValue < options.min) {
    result.valid = false;
    result.error = `值 ${numValue} 小于最小值 ${options.min}`;
    return result;
  }
  
  if (options.max !== undefined && numValue > options.max) {
    result.valid = false;
    result.error = `值 ${numValue} 大于最大值 ${options.max}`;
    return result;
  }
  
  if (options.decimals !== undefined) {
    result.value = parseFloat(numValue.toFixed(options.decimals));
  } else {
    result.value = numValue;
  }
  
  return result;
}

/**
 * 验证百分比值（0-100）
 * @param {*} value - 待验证的值
 * @param {boolean} [allowEmpty] - 是否允许空值
 * @returns {{valid: boolean, value: number, error: string}}
 */
function validatePercentage(value, allowEmpty = true) {
  const result = { valid: true, value: 0, error: '' };
  
  if (allowEmpty && (value === null || value === undefined || value === '' || value === '--')) {
    return result;
  }
  
  // 移除百分号
  const cleanValue = typeof value === 'string' ? value.replace('%', '').trim() : value;
  const numValue = parseFloat(cleanValue);
  
  if (isNaN(numValue)) {
    result.valid = false;
    result.error = `值 "${value}" 不是有效的百分比`;
    return result;
  }
  
  if (numValue < 0 || numValue > 100) {
    result.valid = false;
    result.error = `百分比值 ${numValue}% 超出有效范围(0-100)`;
    return result;
  }
  
  result.value = numValue;
  return result;
}

/**
 * 验证日期时间字符串
 * @param {*} value - 待验证的值
 * @param {boolean} [allowEmpty] - 是否允许空值
 * @returns {{valid: boolean, value: string, error: string}}
 */
function validateDatetime(value, allowEmpty = true) {
  const result = { valid: true, value: '', error: '' };
  
  if (allowEmpty && (value === null || value === undefined || value === '' || value === '--')) {
    return result;
  }
  
  if (typeof value !== 'string') {
    result.valid = false;
    result.error = `值 "${value}" 不是有效的字符串`;
    return result;
  }
  
  // 支持的日期格式
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/
  ];
  
  const isValidFormat = datePatterns.some(pattern => pattern.test(value));
  
  if (!isValidFormat) {
    result.valid = false;
    result.error = `日期格式 "${value}" 无效，期望格式: YYYY-MM-DD HH:MM:SS`;
    return result;
  }
  
  result.value = value;
  return result;
}

/**
 * 验证URL
 * @param {*} value - 待验证的值
 * @param {boolean} [allowEmpty] - 是否允许空值
 * @returns {{valid: boolean, value: string, error: string}}
 */
function validateUrl(value, allowEmpty = true) {
  const result = { valid: true, value: '', error: '' };
  
  if (allowEmpty && (value === null || value === undefined || value === '' || value === '--')) {
    return result;
  }
  
  if (typeof value !== 'string') {
    result.valid = false;
    result.error = `值 "${value}" 不是有效的字符串`;
    return result;
  }
  
  try {
    new URL(value);
    result.value = value;
  } catch {
    result.valid = false;
    result.error = `URL "${value}" 格式无效`;
  }
  
  return result;
}

/**
 * 验证字符串非空
 * @param {*} value - 待验证的值
 * @param {Object} options - 验证选项
 * @param {number} [options.minLength] - 最小长度
 * @param {number} [options.maxLength] - 最大长度
 * @param {boolean} [options.allowEmpty] - 是否允许空值
 * @returns {{valid: boolean, value: string, error: string}}
 */
function validateString(value, options = {}) {
  const result = { valid: true, value: '', error: '' };
  
  if (value === null || value === undefined) {
    if (options.allowEmpty) {
      return result;
    }
    result.valid = false;
    result.error = '值不能为空';
    return result;
  }
  
  const strValue = String(value).trim();
  
  if (!options.allowEmpty && strValue === '') {
    result.valid = false;
    result.error = '值不能为空';
    return result;
  }
  
  if (options.minLength !== undefined && strValue.length < options.minLength) {
    result.valid = false;
    result.error = `字符串长度 ${strValue.length} 小于最小长度 ${options.minLength}`;
    return result;
  }
  
  if (options.maxLength !== undefined && strValue.length > options.maxLength) {
    result.valid = false;
    result.error = `字符串长度 ${strValue.length} 大于最大长度 ${options.maxLength}`;
    return result;
  }
  
  result.value = strValue;
  return result;
}

/**
 * 验证数组
 * @param {*} value - 待验证的值
 * @param {Object} options - 验证选项
 * @param {number} [options.minLength] - 最小长度
 * @param {number} [options.maxLength] - 最大长度
 * @param {Function} [options.itemValidator] - 元素验证函数
 * @returns {{valid: boolean, value: Array, error: string}}
 */
function validateArray(value, options = {}) {
  const result = { valid: true, value: [], error: '' };
  
  if (value === null || value === undefined) {
    return result;
  }
  
  if (!Array.isArray(value)) {
    result.valid = false;
    result.error = `值 "${value}" 不是数组`;
    return result;
  }
  
  if (options.minLength !== undefined && value.length < options.minLength) {
    result.valid = false;
    result.error = `数组长度 ${value.length} 小于最小长度 ${options.minLength}`;
    return result;
  }
  
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    result.valid = false;
    result.error = `数组长度 ${value.length} 大于最大长度 ${options.maxLength}`;
    return result;
  }
  
  if (options.itemValidator) {
    const validatedItems = [];
    for (let i = 0; i < value.length; i++) {
      const itemResult = options.itemValidator(value[i]);
      if (!itemResult.valid) {
        result.valid = false;
        result.error = `数组第 ${i + 1} 个元素验证失败: ${itemResult.error}`;
        return result;
      }
      validatedItems.push(itemResult.value);
    }
    result.value = validatedItems;
  } else {
    result.value = value;
  }
  
  return result;
}

/**
 * 验证对象
 * @param {*} value - 待验证的值
 * @param {Object} schema - 验证schema
 * @returns {{valid: boolean, value: Object, errors: Array}}
 */
function validateObject(value, schema) {
  const result = { valid: true, value: {}, errors: [] };
  
  if (value === null || value === undefined || typeof value !== 'object') {
    result.valid = false;
    result.errors.push('值不是有效的对象');
    return result;
  }
  
  for (const [key, validator] of Object.entries(schema)) {
    const fieldValue = value[key];
    
    if (validator.required && (fieldValue === null || fieldValue === undefined)) {
      result.valid = false;
      result.errors.push(`${key} 是必填字段`);
      continue;
    }
    
    if (validator.type === 'integer') {
      const validation = validateInteger(fieldValue, validator.options);
      result.value[key] = validation.value;
      if (!validation.valid) {
        result.valid = false;
        result.errors.push(`${key}: ${validation.error}`);
      }
    } else if (validator.type === 'float') {
      const validation = validateFloat(fieldValue, validator.options);
      result.value[key] = validation.value;
      if (!validation.valid) {
        result.valid = false;
        result.errors.push(`${key}: ${validation.error}`);
      }
    } else if (validator.type === 'percentage') {
      const validation = validatePercentage(fieldValue, !validator.required);
      result.value[key] = validation.value;
      if (!validation.valid) {
        result.valid = false;
        result.errors.push(`${key}: ${validation.error}`);
      }
    } else if (validator.type === 'datetime') {
      const validation = validateDatetime(fieldValue, !validator.required);
      result.value[key] = validation.value;
      if (!validation.valid) {
        result.valid = false;
        result.errors.push(`${key}: ${validation.error}`);
      }
    } else if (validator.type === 'url') {
      const validation = validateUrl(fieldValue, !validator.required);
      result.value[key] = validation.value;
      if (!validation.valid) {
        result.valid = false;
        result.errors.push(`${key}: ${validation.error}`);
      }
    } else if (validator.type === 'string') {
      const validation = validateString(fieldValue, validator.options);
      result.value[key] = validation.value;
      if (!validation.valid) {
        result.valid = false;
        result.errors.push(`${key}: ${validation.error}`);
      }
    } else if (validator.type === 'array') {
      const validation = validateArray(fieldValue, validator.options);
      result.value[key] = validation.value;
      if (!validation.valid) {
        result.valid = false;
        result.errors.push(`${key}: ${validation.error}`);
      }
    } else if (typeof validator.type === 'object') {
      const validation = validateObject(fieldValue, validator.type);
      result.value[key] = validation.value;
      if (!validation.valid) {
        result.valid = false;
        result.errors.push(...validation.errors.map(e => `${key}.${e}`));
      }
    }
  }
  
  return result;
}

/**
 * 解析模板中的数字占位符
 * @param {string} template - 模板字符串
 * @param {Object} data - 数据对象
 * @returns {{valid: boolean, result: string, errors: Array}}
 */
function parseTemplate(template, data) {
  const result = { valid: true, result: template, errors: [] };
  
  // 匹配 {{数字}} 或 {{N}} 或 {{X}} 或 {{M}} 等占位符
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  let match;
  
  while ((match = placeholderRegex.exec(template)) !== null) {
    const placeholder = match[1];
    const placeholderValue = data[placeholder];
    
    if (placeholderValue === undefined || placeholderValue === null) {
      result.valid = false;
      result.errors.push(`缺少占位符 "${placeholder}" 的值`);
      result.result = result.result.replace(match[0], '--');
      continue;
    }
    
    // 尝试转换为数字
    const numValue = parseFloat(placeholderValue);
    
    if (!isNaN(numValue)) {
      result.result = result.result.replace(match[0], numValue.toString());
    } else {
      result.result = result.result.replace(match[0], String(placeholderValue));
    }
  }
  
  return result;
}

/**
 * 从文本中提取所有数字
 * @param {string} text - 输入文本
 * @returns {number[]} 提取的数字数组
 */
function extractNumbers(text) {
  const regex = /[\d.]+/g;
  const matches = text.match(regex);
  if (!matches) return [];
  return matches.map(m => parseFloat(m)).filter(n => !isNaN(n));
}

/**
 * 格式化数字为百分比
 * @param {number} value - 数字值
 * @param {number} [decimals] - 小数位数
 * @returns {string} 格式化后的百分比字符串
 */
function formatPercentage(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * 格式化数字
 * @param {number} value - 数字值
 * @param {Object} options - 格式化选项
 * @param {number} [options.decimals] - 小数位数
 * @param {string} [options.prefix] - 前缀
 * @param {string} [options.suffix] - 后缀
 * @returns {string} 格式化后的字符串
 */
function formatNumber(value, options = {}) {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }
  
  let formatted = value.toFixed(options.decimals || 0);
  
  if (options.prefix) {
    formatted = options.prefix + formatted;
  }
  
  if (options.suffix) {
    formatted = formatted + options.suffix;
  }
  
  return formatted;
}

/**
 * 验证并修复数据对象
 * @param {Object} data - 待验证的数据对象
 * @param {Object} schema - 验证schema
 * @returns {{valid: boolean, data: Object, errors: Array, warnings: Array}}
 */
function validateAndFix(data, schema) {
  const result = { valid: true, data: {}, errors: [], warnings: [] };
  
  for (const [key, config] of Object.entries(schema)) {
    const value = data[key];
    
    if (config.required && (value === undefined || value === null || value === '')) {
      result.valid = false;
      result.errors.push(`${key} 是必填字段`);
      result.data[key] = config.default !== undefined ? config.default : '';
      continue;
    }
    
    if (value === undefined || value === null) {
      result.data[key] = config.default !== undefined ? config.default : '';
      if (config.required) {
        result.warnings.push(`${key} 使用默认值: ${result.data[key]}`);
      }
      continue;
    }
    
    if (config.type === 'integer') {
      const validation = validateInteger(value, {
        min: config.min,
        max: config.max,
        default: config.default
      });
      result.data[key] = validation.value;
      if (!validation.valid) {
        result.warnings.push(`${key}: ${validation.error}，已修复为 ${validation.value}`);
      }
    } else if (config.type === 'float') {
      const validation = validateFloat(value, {
        min: config.min,
        max: config.max,
        decimals: config.decimals,
        default: config.default
      });
      result.data[key] = validation.value;
      if (!validation.valid) {
        result.warnings.push(`${key}: ${validation.error}，已修复为 ${validation.value}`);
      }
    } else if (config.type === 'percentage') {
      const validation = validatePercentage(value);
      result.data[key] = validation.value;
      if (!validation.valid) {
        result.warnings.push(`${key}: ${validation.error}，已修复为 ${validation.value}`);
      }
    } else if (config.type === 'string') {
      result.data[key] = String(value).trim();
      if (config.maxLength && result.data[key].length > config.maxLength) {
        result.data[key] = result.data[key].substring(0, config.maxLength);
        result.warnings.push(`${key} 超出最大长度限制，已截断`);
      }
    } else if (config.type === 'array') {
      if (!Array.isArray(value)) {
        result.data[key] = config.default || [];
        result.warnings.push(`${key} 不是数组，已使用默认值`);
      } else {
        result.data[key] = value;
        if (config.maxLength && value.length > config.maxLength) {
          result.data[key] = value.slice(0, config.maxLength);
          result.warnings.push(`${key} 超出最大元素数量限制，已截断`);
        }
      }
    } else {
      result.data[key] = value;
    }
  }
  
  return result;
}

module.exports = {
  validateInteger,
  validateFloat,
  validatePercentage,
  validateDatetime,
  validateUrl,
  validateString,
  validateArray,
  validateObject,
  parseTemplate,
  extractNumbers,
  formatPercentage,
  formatNumber,
  validateAndFix
};
