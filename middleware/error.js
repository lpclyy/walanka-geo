/**
 * 错误处理中间件
 * @module middleware/error
 * @description 提供全局错误处理和日志记录功能
 */

/**
 * 全局错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件函数
 */
function errorHandler(err, req, res, next) {
  console.error('========== 错误日志 ==========');
  console.error('时间:', new Date().toISOString());
  console.error('请求路径:', req.method, req.originalUrl);
  console.error('错误信息:', err.message);
  console.error('错误堆栈:', err.stack);
  console.error('==============================');

  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
}

/**
 * 404处理中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: '请求的资源不存在'
  });
}

/**
 * 异步处理包装器
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 创建自定义错误对象
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @returns {Error} 自定义错误对象
 */
function createError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * 请求日志中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件函数
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });

  next();
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  requestLogger
};
