/**
 * 第三方API配置文件
 * @module config/api
 * @description 配置第三方API服务参数
 */

module.exports = {
  // 腾讯云短信服务配置
  tencentCloud: {
    secretId: process.env.TENCENTCLOUD_SECRET_ID || '',
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY || '',
    smsAppId: process.env.TENCENTCLOUD_SMS_APPID || '',
    smsSign: process.env.TENCENTCLOUD_SMS_SIGN || '',
    smsTemplateId: process.env.TENCENTCLOUD_SMS_TEMPLATE_ID || ''
  },

  // SiliconFlow API配置
  siliconFlow: {
    apiKey: process.env.SF_API_KEY || '',
    apiUrl: process.env.SF_API_URL || 'https://api.siliconflow.cn/v1/chat/completions',
    model: process.env.SF_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
    temperature: 0.7,
    maxTokens: 1000
  },

  // 大模型API配置（用于GEO分析）
  llm: {
    apiKey: process.env.LLM_API_KEY || '',
    apiUrl: process.env.LLM_API_URL || '',
    model: process.env.LLM_MODEL || '',
    agent: process.env.LLM_AGENT || '',
    temperature: 0.7,
    maxTokens: 4000
  },

  // 微信支付配置
  wechatPay: {
    appId: process.env.WECHAT_PAY_APPID || '',
    mchId: process.env.WECHAT_PAY_MCHID || '',
    apiKey: process.env.WECHAT_PAY_API_KEY || '',
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || ''
  },

  // 支付宝配置
  alipay: {
    appId: process.env.ALIPAY_APPID || '',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    notifyUrl: process.env.ALIPAY_NOTIFY_URL || ''
  }
};
