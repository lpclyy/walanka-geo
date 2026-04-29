/**
 * AI聊天路由模块
 * @module routes/chat
 * @description 提供AI对话相关路由
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const { sendSuccess, sendError } = require('../utils/response');
const { isNonEmptyArray } = require('../utils/validation');

/**
 * POST /api/chat
 * AI对话接口
 */
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!isNonEmptyArray(messages)) {
      return sendError(res, '请提供有效的对话内容', 400);
    }

    const apiKey = config.api.siliconFlow.apiKey;
    const apiUrl = config.api.siliconFlow.apiUrl;
    const model = config.api.siliconFlow.model;

    if (!apiKey) {
      return sendError(res, 'AI服务未配置，请联系管理员', 500);
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: config.api.siliconFlow.temperature,
        max_tokens: config.api.siliconFlow.maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API调用失败: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      throw new Error('API响应格式错误');
    }

    const answer = data.choices[0].message.content;
    return sendSuccess(res, { answer });
  } catch (error) {
    console.error('AI对话失败:', error);
    return sendError(res, error.message || 'AI对话失败');
  }
});

module.exports = router;
