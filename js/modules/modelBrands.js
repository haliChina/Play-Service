// AI 模型品牌识别与本地 SVG 资产映射。
// 图标来自 @lobehub/icons（MIT），本地托管以避免 CDN 故障和隐私泄露。

const BRAND_RULES = [
  { id: 'xiaomimimo', label: 'Xiaomi MiMo', model: /(?:^|[-_/])mimo(?:[-_/]|$)|xiaomi/i, endpoint: /xiaomi|mimo/i },
  { id: 'deepseek', label: 'DeepSeek', model: /deepseek/i, endpoint: /deepseek/i },
  { id: 'claude', label: 'Claude', model: /claude/i, endpoint: /anthropic/i },
  { id: 'qwen', label: 'Qwen', model: /qwen|tongyi/i, endpoint: /dashscope|aliyun|alibaba|qwen/i },
  { id: 'doubao', label: '豆包', model: /doubao|seed[-_]?1/i, endpoint: /volces|volcengine|ark\.cn|doubao/i },
  { id: 'chatglm', label: '智谱 GLM', model: /(?:^|[-_/])glm|chatglm/i, endpoint: /bigmodel|zhipu|chatglm/i },
  { id: 'kimi', label: 'Kimi', model: /kimi|moonshot/i, endpoint: /moonshot|kimi/i },
  { id: 'stepfun', label: '阶跃星辰', model: /step[-_]?\d|stepfun/i, endpoint: /stepfun|step\.ai/i },
  { id: 'openai', label: 'OpenAI', model: /(?:^|[-_/])(gpt|o1|o3|o4)(?:[-_/]|$)|chatgpt/i, endpoint: /openai/i },
  { id: 'gemini', label: 'Gemini', model: /gemini/i, endpoint: /googleapis|generativelanguage|vertexai/i },
  { id: 'grok', label: 'Grok', model: /grok/i, endpoint: /x\.ai|xai/i },
  { id: 'mistral', label: 'Mistral', model: /mistral|mixtral|codestral/i, endpoint: /mistral/i },
  { id: 'cohere', label: 'Cohere', model: /command[-_]?r|cohere/i, endpoint: /cohere/i },
  { id: 'hunyuan', label: '腾讯混元', model: /hunyuan/i, endpoint: /hunyuan|tencent/i },
  { id: 'wenxin', label: '文心一言', model: /ernie|wenxin/i, endpoint: /qianfan|baidu/i },
  { id: 'spark', label: '讯飞星火', model: /spark/i, endpoint: /xfyun|spark/i },
  { id: 'minimax', label: 'MiniMax', model: /minimax|abab/i, endpoint: /minimax/i },
  { id: 'yi', label: '零一万物 Yi', model: /(?:^|[-_/])yi(?:[-_/]|$)/i, endpoint: /lingyi|01\.ai/i },
  { id: 'baichuan', label: '百川', model: /baichuan/i, endpoint: /baichuan/i },
  { id: 'siliconcloud', label: '硅基流动', model: /siliconcloud/i, endpoint: /siliconflow/i },
  { id: 'anthropic', label: 'Anthropic', model: /anthropic/i, endpoint: /anthropic/i }
];

export function detectModelBrand(model = '', baseUrl = '') {
  const modelText = String(model || '').trim();
  const endpointText = String(baseUrl || '').trim();
  // 优先模型名，避免在硅基流动等聚合平台上把 DeepSeek/Qwen 错标成平台 Logo。
  let rule = BRAND_RULES.find(item => item.model.test(modelText));
  if (!rule) rule = BRAND_RULES.find(item => item.endpoint.test(endpointText));
  if (!rule) return { id: 'default', label: 'AI Agent', iconUrl: '' };
  return {
    id: rule.id,
    label: rule.label,
    iconUrl: `/assets/model-icons/${rule.id}.svg`
  };
}

export function getCurrentModelBrand() {
  try {
    const settings = JSON.parse(localStorage.getItem('yihui-settings') || '{}');
    const llm = settings.llm || {};
    return detectModelBrand(llm.model, llm.baseUrl);
  } catch {
    return detectModelBrand();
  }
}
