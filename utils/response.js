/**
 * 响应处理工具函数
 * @module utils/response
 * @description 提供统一的API响应处理函数
 */

/**
 * 发送成功响应
 * @param {Object} res - Express响应对象
 * @param {Object} data - 响应数据
 * @param {string} message - 成功消息
 * @param {number} statusCode - HTTP状态码
 */
function sendSuccess(res, data = null, message = '操作成功', statusCode = 200) {
  const response = {
    success: true,
    message
  };
  if (data !== null) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
}

/**
 * 发送错误响应
 * @param {Object} res - Express响应对象
 * @param {string} error - 错误信息
 * @param {number} statusCode - HTTP状态码
 */
function sendError(res, error = '操作失败', statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error
  });
}

/**
 * 发送验证错误响应
 * @param {Object} res - Express响应对象
 * @param {string[]} errors - 错误信息数组
 */
function sendValidationError(res, errors) {
  return res.status(400).json({
    success: false,
    error: '验证失败',
    details: errors
  });
}

/**
 * 发送未找到响应
 * @param {Object} res - Express响应对象
 * @param {string} resource - 资源名称
 */
function sendNotFound(res, resource = '资源') {
  return res.status(404).json({
    success: false,
    error: `${resource}不存在`
  });
}

/**
 * 发送未授权响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
function sendUnauthorized(res, message = '未授权访问') {
  return res.status(401).json({
    success: false,
    error: message
  });
}

/**
 * 发送禁止访问响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
function sendForbidden(res, message = '禁止访问') {
  return res.status(403).json({
    success: false,
    error: message
  });
}

/**
 * 发送分页响应
 * @param {Object} res - Express响应对象
 * @param {Array} data - 数据列表
 * @param {Object} pagination - 分页信息
 */
function sendPaginated(res, data, pagination) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.pageSize)
    }
  });
}

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendPaginated
};
