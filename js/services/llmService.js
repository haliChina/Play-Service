// ============================================
// 大模型服务 — OpenAI 兼容格式
// 支持用户自主配置（DeepSeek/智谱/Moonshot/通义等）
// 一会去哪儿 · LLM Service
// ============================================

import { getSettings } from '../modules/settings.js';
import { getToolDefinitions, executeTool } from './agentTools.js';
import { enrichPOIsWithImages } from './mapService.js';

/**
 * 将图片列表构建为 OpenAI Vision 兼容的多模态 content
 * @param {Array} images - [{name, url}, ...]
 * @returns {Array|null} content 数组，或 null（无有效图片）
 */
function buildVisionContent(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const parts = [
    { type: 'text', text: '以下是搜索到的景点实景图片，请结合图片内容分析景点特色（如环境、风格、是否适合拍照/亲子/户外等），再决定推荐。' }
  ];
  let added = 0;
  for (const img of images) {
    if (!img || !img.url) continue;
    // OpenAI Vision 支持 http(s) URL 或 data:image base64
    parts.push({
      type: 'text',
      text: `【${img.name || '景点'}】`
    });
    parts.push({
      type: 'image_url',
      image_url: { url: img.url, detail: 'low' }  // low detail 节省 token
    });
    added++;
    if (added >= 4) break; // 最多 4 张，控制成本
  }
  return added > 0 ? parts : null;
}

/**
 * 视觉确认：为最终推荐景点配图，并将图片发给模型进行视觉分析确认
 * 模型可基于图片内容调整 matchScore、补充 reason/highlights
 * @param {Object} plan - 已解析的攻略对象
 * @param {Function} onStep - 步骤回调
 * @returns {Promise<Object>} 更新后的 plan（recommendations 附带 photos 和视觉确认结果）
 */
async function visionConfirmPlan(plan, onStep) {
  if (!plan?.recommendations || plan.recommendations.length === 0) return plan;

  const recs = plan.recommendations;
  // 1. 先为所有推荐景点获取真实图片（阻塞，确保图片就绪）
  if (onStep) onStep({ type: 'thinking', content: `视觉确认：正在为 ${recs.length} 个推荐景点获取配图…` });
  try {
    await enrichPOIsWithImages(recs, Math.min(recs.length, 12));
  } catch (e) {
    console.warn('[视觉确认] 配图获取失败，跳过:', e.message);
    return plan;
  }

  // 2. 收集有图片的景点
  const withImages = recs.filter(r => r.photos && r.photos.length > 0);
  if (withImages.length === 0) {
    if (onStep) onStep({ type: 'thinking', content: '视觉确认：未获取到景点图片，跳过' });
    return plan;
  }

  if (onStep) onStep({ type: 'thinking', content: `视觉确认：将 ${Math.min(withImages.length, 8)} 张景点图片传给模型分析…` });

  // 3. 构建 vision content，让模型逐个确认
  const visionContent = [
    { type: 'text', text: `以下是最终推荐的 ${withImages.length} 个景点的配图。请逐个分析图片内容，重点判断"图片是否真的是该景点的真实照片"。返回 JSON：
{
  "confirmations": [
    {
      "name": "景点名（与下方标注一致）",
      "imageMatch": true|false（图片是否是该景点的真实照片）,
      "mismatchReason": "不匹配原因（imageMatch 为 false 时填写）,
      "matchScore": 0-100（基于图片观察调整后的匹配度）,
      "reason": "结合图片内容的推荐理由（如环境、风格、出片度等）",
      "highlights": ["图片中观察到的亮点1", "亮点2"],
      "visionNote": "图片分析备注（可选）"
    }
  ]
}
⚠️ imageMatch 判断要点（必须严格）：
- 图片是真实的景点建筑/自然风景照片 → true
- 图片是动漫/卡通/Logo/人物/无关内容 → false
- 图片是地铁线路图/地图/路线图/示意图 → false
- 图片是文字截图/文档/表格 → false
- 图片明显与景点名不符 → false
- 无法确定或图片模糊无法辨认 → false（保守判定）
注意：只返回 JSON，不要其他文字。reason 不超过40字。` }
  ];

  let added = 0;
  for (const rec of withImages) {
    if (added >= 8) break; // 最多 8 张，控制成本
    // 校验图片 URL 有效性（必须是 http(s) 且非明显无效）
    const imgUrl = rec.photos[0];
    if (!imgUrl || !/^https?:\/\//i.test(imgUrl)) continue;
    visionContent.push({ type: 'text', text: `【${rec.name}】` });
    visionContent.push({
      type: 'image_url',
      image_url: { url: imgUrl, detail: 'low' }
    });
    added++;
  }

  if (added === 0) return plan;

  // 4. 调用模型进行视觉确认
  // ⚠️ 不使用 responseFormat:'json'，因为部分模型在 json 模式下会忽略 image_url content
  // 改为在 prompt 中明确要求 JSON 输出，并从文本中提取
  try {
    const confirmMessage = await chatRaw(
      [
        { role: 'system', content: '你是旅游攻略视觉确认助手。根据景点配图，判断图片是否是景点的真实照片，并分析景点特色。重点识别错配图片（动漫/卡通/Logo/地图/路线图/无关内容）。你的输出必须是一个合法 JSON 对象，不要输出任何其他文字。' },
        { role: 'user', content: visionContent }
      ],
      { temperature: 0.3, maxTokens: 1500 }
    );

    // 5. 解析确认结果并合并回 plan
    let confirmations = [];
    try {
      const parsed = JSON.parse(confirmMessage.content);
      confirmations = parsed.confirmations || parsed.recommendations || [];
    } catch {
      const m = (confirmMessage.content || '').match(/\{[\s\S]*\}/);
      if (m) {
        try {
          const parsed = JSON.parse(m[0]);
          confirmations = parsed.confirmations || parsed.recommendations || [];
        } catch {}
      }
    }

    // 按景点名合并
    const confirmMap = {};
    for (const c of confirmations) {
      if (c.name) confirmMap[c.name] = c;
    }

    let updatedCount = 0;
    let removedImageCount = 0;
    for (const rec of recs) {
      const c = confirmMap[rec.name];
      if (c) {
        // 图片不匹配 → 移除错误图片，避免展示米老鼠/动漫等错配
        if (c.imageMatch === false) {
          if (rec.photos && rec.photos.length > 0) {
            rec.photos = [];
            removedImageCount++;
            console.warn(`[视觉确认] 移除错配图片: ${rec.name} (${c.mismatchReason || '图片与景点不符'})`);
          }
          if (c.mismatchReason) rec.imageMismatch = c.mismatchReason;
        } else {
          // 图片匹配，更新推荐信息
          if (typeof c.matchScore === 'number') rec.matchScore = c.matchScore;
          if (c.reason) rec.reason = c.reason;
          if (Array.isArray(c.highlights) && c.highlights.length > 0) rec.highlights = c.highlights;
          if (c.visionNote) rec.visionNote = c.visionNote;
          rec.visionConfirmed = true;
        }
        updatedCount++;
      }
    }

    const msg = removedImageCount > 0
      ? `视觉确认完成：更新 ${updatedCount} 个景点，移除 ${removedImageCount} 张错配图片`
      : `视觉确认完成：已基于图片分析更新 ${updatedCount} 个景点的推荐理由`;
    if (onStep) onStep({ type: 'thinking', content: msg });
    console.log(`[视觉确认] 已更新 ${updatedCount}/${recs.length}，移除错配图片 ${removedImageCount} 张`);
  } catch (e) {
    console.warn('[视觉确认] 模型分析失败，保留原推荐:', e.message);
    if (onStep) onStep({ type: 'thinking', content: '视觉确认失败，保留原推荐' });
  }

  return plan;
}

// 预设大模型配置模板（仅保留自定义，遵循 OpenAI 协议）
export const LLM_PRESETS = {
  custom: {
    label: '自定义（OpenAI 协议）',
    baseUrl: '',
    model: '',
    docsUrl: '',
    description: '任何兼容 OpenAI 格式的 API，需保留 /v1 前缀'
  },
};

/**
 * 调用大模型 Chat Completions API（底层封装，支持 tools）
 * 策略：用户配置了 apiKey → 直连；未配置 → 走 /api/llm 服务端代理（需配置环境变量）
 * @param {Array} messages - 消息列表 [{role, content, tool_calls, tool_call_id}]
 * @param {Object} options - 可选参数 {temperature, maxTokens, responseFormat, tools}
 * @returns {Promise<Object>} 模型回复 message 对象（含 content 和/或 tool_calls）
 */
export async function chatRaw(messages, options = {}) {
  const settings = getSettings();
  const llmConfig = settings.llm;

  const body = {
    model: llmConfig.model || 'gpt-3.5-turbo',
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens || 2000,
  };

  if (options.responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  // 工具定义（OpenAI Function Calling）
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice || 'auto';
  }

  // 流式输出：当传入 onStream 回调时启用
  const wantStream = typeof options.onStream === 'function';
  if (wantStream) {
    body.stream = true;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 流式模式延长到 60 秒

  let response;
  try {
    if (llmConfig.apiKey) {
      if (!llmConfig.baseUrl) {
        throw new Error('请先配置 API Base URL（需保留 /v1 前缀）');
      }
      const baseUrl = llmConfig.baseUrl.replace(/\/$/, '');
      const url = `${baseUrl}/chat/completions`;
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmConfig.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } else {
      response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    }
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error('大模型请求超时（60秒）');
    throw e;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    // 流式请求失败时，尝试降级为非流式重试（部分供应商不支持 stream+tools 组合）
    if (wantStream) {
      console.warn(`[chatRaw] 流式请求失败 (${response.status})，降级到非流式`);
      const fallbackBody = { ...body };
      delete fallbackBody.stream;
      const fbResp = await (llmConfig.apiKey
        ? fetch(`${llmConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmConfig.apiKey}` },
            body: JSON.stringify(fallbackBody)
          })
        : fetch('/api/llm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackBody)
          }));
      if (fbResp.ok) {
        const fbData = await fbResp.json();
        if (fbData.choices?.[0]?.message?.content) {
          try { options.onStream(fbData.choices[0].message.content, fbData.choices[0].message.content); } catch {}
        }
        return fbData.choices[0].message;
      }
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`大模型API请求失败 (${response.status}): ${errorText.slice(0, 200)}`);
  }

  // ---- 流式：读取 SSE，累积 content 与 tool_calls，逐字回调 ----
  if (wantStream && response.body && typeof response.body.getReader === 'function') {
    try {
      return await readStream(response.body, options.onStream);
    } catch (e) {
      console.warn('[chatRaw] 流式读取失败，降级到非流式:', e.message);
      // 降级：重新发起非流式请求
      const fallbackBody = { ...body };
      delete fallbackBody.stream;
      const fallbackResp = await (llmConfig.apiKey
        ? fetch(`${llmConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmConfig.apiKey}` },
            body: JSON.stringify(fallbackBody)
          })
        : fetch('/api/llm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackBody)
          }));
      if (!fallbackResp.ok) throw new Error(`大模型API降级请求失败 (${fallbackResp.status})`);
      const fallbackData = await fallbackResp.json();
      if (fallbackData.choices?.[0]?.message?.content) {
        options.onStream(fallbackData.choices[0].message.content, fallbackData.choices[0].message.content);
      }
      return fallbackData.choices[0].message;
    }
  }

  // ---- 非流式（原逻辑） ----
  const data = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('大模型返回空结果');
  }

  return data.choices[0].message; // 返回完整 message 对象
}

/**
 * 读取 OpenAI 兼容的 SSE 流，累积 content 和 tool_calls
 * @param {ReadableStream} stream - response.body
 * @param {Function} onStream - (delta, fullContent) => void
 * @returns {Promise<Object>} 累积后的 message 对象
 */
async function readStream(stream, onStream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const toolCallMap = {}; // index -> {id, function:{name, arguments}}

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // 按 SSE 协议处理完整行（以 \n 结尾）
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line || !line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          content += delta.content;
          try { onStream(delta.content, content); } catch {}
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallMap[idx]) {
              toolCallMap[idx] = { id: tc.id || '', type: 'function', function: { name: '', arguments: '' } };
            }
            if (tc.id) toolCallMap[idx].id = tc.id;
            if (tc.function?.name) toolCallMap[idx].function.name += tc.function.name;
            if (tc.function?.arguments) toolCallMap[idx].function.arguments += tc.function.arguments;
          }
        }
      } catch {} // 忽略不完整的 JSON 行
    }
  }

  const toolCalls = Object.keys(toolCallMap).sort((a, b) => Number(a) - Number(b)).map(k => toolCallMap[k]);
  const message = { role: 'assistant', content: content || null };
  if (toolCalls.length > 0) message.tool_calls = toolCalls;
  return message;
}

/**
 * 兼容旧接口：调用大模型，返回文本
 */
export async function chat(messages, options = {}) {
  const message = await chatRaw(messages, options);
  return message.content || '';
}

/**
 * Agent 主循环 — 实现 OpenAI ToolCall 多轮调用
 * 模型会持续调用工具直到收集足够信息，最终返回结构化旅游攻略
 *
 * @param {string} userInput - 用户自然语言需求
 * @param {Object} context - 上下文 {currentLocation, targetLocation, weather, city, address}
 * @param {Function} onStep - 回调 (step) => void，用于实时展示 Agent 思考过程
 *   step = {type: 'thinking'|'tool_call'|'tool_result'|'stream'|'stream_update'|'final', ...}
 *   - stream: 流式输出开始（content 为已累积内容），stream_update: 流式增量更新
 * @returns {Promise<Object>} {plan, toolCalls, steps}
 */
export async function runAgent(userInput, context = {}, onStep = null) {
  const tools = getToolDefinitions();

  // 构建 System Prompt（综合当前位置和目标位置）
  const systemPrompt = buildAgentSystemPrompt(context);

  // 关键改进：将意图摘要注入 user message，确保模型明确理解用户意图
  const intentSummary = context.intentSummary || '';
  const userMessage = intentSummary
    ? `${intentSummary}\n\n用户原始输入：${userInput}`
    : userInput;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  const steps = [];
  const toolCalls = [];
  const MAX_ITERATIONS = 8; // 最大循环次数，防止死循环

  const report = (step) => {
    steps.push(step);
    if (onStep) onStep(step);
  };

  report({ type: 'thinking', content: 'Agent 开始分析你的需求…' });

  // 视觉理解开关
  const visionEnabled = getSettings().llm?.visionSupported === true;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // 调用 LLM
    report({ type: 'thinking', content: i === 0 ? '正在规划需要调用的工具…' : '根据工具返回结果，继续规划…' });

    // 流式输出：逐字展示模型生成内容（工具调用轮次通常无 content，不会触发）
    let streamStep = null;
    const onStream = (_delta, fullContent) => {
      if (!streamStep) {
        streamStep = { type: 'stream', content: fullContent };
        report(streamStep);
      } else {
        streamStep.content = fullContent;
        if (onStep) onStep({ type: 'stream_update', content: fullContent });
      }
    };

    const assistantMessage = await chatRaw(messages, {
      temperature: 0.4,
      maxTokens: 1500,
      tools,
      onStream
    });

    // 如果没有 tool_calls，说明模型已给出最终答案
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      report({ type: 'final', content: assistantMessage.content ? '生成完成' : '已完成分析' });

      // 解析最终攻略
      let plan = parseAgentPlan(assistantMessage.content, toolCalls, context);

      // 视觉确认：开启视觉理解时，为每个推荐景点配图并发给模型分析确认
      if (visionEnabled && plan.recommendations && plan.recommendations.length > 0) {
        plan = await visionConfirmPlan(plan, onStep);
      }

      return { plan, toolCalls, steps, rawResponse: assistantMessage.content };
    }

    // 将 assistant 消息（含 tool_calls）加入对话
    messages.push(assistantMessage);

    // 执行每个工具调用
    for (const tc of assistantMessage.tool_calls) {
      const toolName = tc.function.name;
      let toolArgs = {};
      try {
        toolArgs = JSON.parse(tc.function.arguments || '{}');
      } catch (e) {
        console.warn(`[Agent] 工具参数解析失败: ${tc.function.arguments}`, e);
      }

      report({
        type: 'tool_call',
        toolName,
        toolArgs,
        content: `调用工具：${toolName}`
      });

      try {
        const result = await executeTool(toolName, toolArgs);
        toolCalls.push({ name: toolName, args: toolArgs, result });
        report({
          type: 'tool_result',
          toolName,
          result,
          content: result.summary || `工具 ${toolName} 执行完成`
        });

        // 工具结果中可能包含敏感字段（如 images），序列化时剔除以节省 token
        const { images: _omitImages, ...resultForModel } = result;
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(resultForModel)
        });

        // 视觉理解：若 search_places 返回了图片，追加一条 user 消息让模型"看图"
        if (visionEnabled && Array.isArray(result.images) && result.images.length > 0) {
          const visionContent = buildVisionContent(result.images);
          if (visionContent) {
            messages.push({ role: 'user', content: visionContent });
            report({
              type: 'thinking',
              content: `已将 ${result.images.length} 张实景图片传给模型进行视觉分析`
            });
          }
        }
      } catch (err) {
        const errMsg = `工具 ${toolName} 执行失败: ${err.message}`;
        console.error('[Agent]', errMsg);
        toolCalls.push({ name: toolName, args: toolArgs, error: err.message });
        report({ type: 'tool_result', toolName, error: err.message, content: errMsg });
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: err.message })
        });
      }
    }
  }

  // 达到最大循环次数，强制要求模型给出最终答案
  report({ type: 'thinking', content: '已收集足够信息，正在生成最终攻略…' });
  messages.push({
    role: 'user',
    content: '请基于已收集的信息，立即输出最终的旅游攻略JSON，不要再调用工具。'
  });
  // 流式输出最终攻略
  let finalStreamStep = null;
  const onFinalStream = (_delta, fullContent) => {
    if (!finalStreamStep) {
      finalStreamStep = { type: 'stream', content: fullContent };
      report(finalStreamStep);
    } else {
      finalStreamStep.content = fullContent;
      if (onStep) onStep({ type: 'stream_update', content: fullContent });
    }
  };
  const finalMessage = await chatRaw(messages, { temperature: 0.4, maxTokens: 2000, onStream: onFinalStream });
  report({ type: 'final', content: finalMessage.content ? '生成完成' : '已完成' });

  let plan = parseAgentPlan(finalMessage.content, toolCalls, context);

  // 视觉确认（强制最终答案路径同样处理）
  if (visionEnabled && plan.recommendations && plan.recommendations.length > 0) {
    plan = await visionConfirmPlan(plan, onStep);
  }

  return { plan, toolCalls, steps, rawResponse: finalMessage.content };
}

/**
 * 构建 Agent System Prompt
 */
function buildAgentSystemPrompt(context) {
  const { currentLocation, targetLocation, weather, city, address, userAddress, isCrossCity, searchCity, planTemplate, visionSupported, dayCount } = context;

  let locationInfo = '';
  if (currentLocation) {
    locationInfo += `\n【用户当前位置】${currentLocation.formattedAddress || currentLocation.text || ''}`;
    if (currentLocation.lat) locationInfo += `\n坐标：${currentLocation.lat}, ${currentLocation.lng}`;
  }
  if (userAddress) {
    locationInfo += `\n【用户输入的地址】${userAddress.formattedAddress || userAddress.text || ''}`;
    if (userAddress.lat) locationInfo += `\n坐标：${userAddress.lat}, ${userAddress.lng}`;
  }
  if (city) locationInfo += `\n【当前城市】${city}`;

  // 跨城旅游提示（关键：告诉模型搜索目标城市的 POI）
  let travelContext = '';
  if (isCrossCity && targetLocation) {
    travelContext = `\n【旅游目的地】${targetLocation}
【跨城旅游】是。用户要从 ${city || '当前位置'} 前往 ${targetLocation} 旅游。
⚠️ 重要：搜索地点（search_places）时，city 参数必须填 "${targetLocation}"，不要填当前城市 "${city || ''}"。
查天气（get_weather）时，city 参数也必须填 "${targetLocation}"。
同时调用 search_tickets 查询 ${city || '出发地'} → ${targetLocation} 的车票/机票。
如果用户需要过夜，调用 search_hotels 查询 ${targetLocation} 的酒店。`;
  } else if (targetLocation) {
    travelContext = `\n【目标地点】${targetLocation}`;
  }

  let weatherInfo = '';
  if (weather) {
    weatherInfo = `\n【当前天气】${weather.weatherDesc}，${weather.temp}°C（体感${weather.feelsLike}°C），湿度${weather.humidity}%，风力${weather.windLevel}级，来源：${weather.source}`;
  }

  // 规划模板说明
  let planTemplateInfo = '';
  const tpl = planTemplate || 'auto';
  if (tpl === 'flat') {
    planTemplateInfo = `\n【规划模板】平铺排列（flat）。所有推荐地点平铺展示，planMode 必须为 "flat"，不需要 itinerary 数组，recommendations 不需要 day/timeSlot 字段。`;
  } else if (tpl === 'timeline') {
    planTemplateInfo = `\n【规划模板】时间线排列（timeline）。按上午/下午/晚上组织行程，planMode 必须为 "timeline"，每个 recommendation 必须有 timeSlot（morning/afternoon/evening），day 统一为 1，必须输出 itinerary 数组。`;
  } else if (tpl === 'multi-day') {
    const days = dayCount || 3;
    planTemplateInfo = `\n【规划模板】多日规划（timeline）。规划 ${days} 天行程，planMode 必须为 "timeline"，每个 recommendation 必须有 day（1..${days}）和 timeSlot（morning/afternoon/evening），必须输出 itinerary 数组，按天组织。`;
  } else {
    // auto：模型自行判断。但多日旅游强匹配 Day1/Day2 时间线
    const multiDay = context.isMultiDay;
    const days = dayCount || 0;
    if (multiDay) {
      planTemplateInfo = `\n【规划模板】自动（已检测到多日旅游）。⚠️ 强制使用时间线模式：planMode 必须为 "timeline"，必须输出 itinerary 数组按天组织（Day1、Day2${days > 2 ? `…Day${days}` : ''}）。每个 recommendation 必须有 day（1..${days || 2}）和 timeSlot（morning/afternoon/evening）字段。${days ? `共规划 ${days} 天。` : ''}`;
    } else {
      planTemplateInfo = `\n【规划模板】自动。你可以根据需求自行选择：单日/半日 → planMode="flat"（平铺，无 itinerary）；若用户提到天数/Day/几天/多日 → planMode="timeline" 并输出 itinerary 按 Day1/Day2 组织。跨城旅游通常多日，应使用 timeline。`;
    }
  }

  // 视觉理解说明
  const visionInfo = visionSupported
    ? `\n【视觉理解】已开启。search_places 会附带景点实景图片供你分析；最终生成推荐后，系统会将每个景点的配图再次发给你进行视觉确认，请结合图片内容分析景点特色（环境、风格、是否出片等）后再决定推荐，推荐理由可引用图片观察到的细节。`
    : '';

  return `你是一个专业的旅游攻略 Agent 助手。你可以调用一系列工具来收集信息，然后为用户生成个性化的旅游攻略。

## 可用工具
- get_weather: 查询天气（判断户外/室内活动）
- search_places: 搜索地图真实地点（POI）
- search_tickets: 查询火车票/机票（生成预订链接）
- search_hotels: 查询酒店住宿（生成预订链接）
- get_navigation: 生成导航链接
- web_search: 网页搜索（攻略、门票、开放时间等）
- geocode: 地址转坐标
- reverse_geocode: 坐标转地址
- ask_user: 向用户提问收集缺失信息（单选/多选/文字，支持超时取消）

## 上下文${locationInfo}${travelContext}${weatherInfo}${planTemplateInfo}${visionInfo}

## 工作流程（Agent 思考链）
1. **分析意图**：判断用户是要本地探索还是跨城旅游
2. **规划工具**：列出需要调用的工具（天气→地点→交通→住宿→攻略）
3. **执行工具**：按计划调用工具收集信息
4. **综合决策**：基于工具返回结果，生成个性化推荐

## ToolCall 决策提示
- 用户提到"前往/去/到XX旅游/玩"→ **跨城旅游**：search_places 的 city 必须填目标城市，不要填当前城市
- 用户提到"住一晚/住宿/酒店"→ 调用 search_hotels
- 用户提到具体景点名（如"故宫""西湖"）→ 调用 web_search 查攻略和门票
- 天气恶劣（雨/雪/雾霾）→ 优先推荐室内地点（博物馆、商场、咖啡馆）
- 用户带娃/亲子 → 优先推荐公园、亲子乐园

## 何时调用 ask_user（主动问清模糊点）
只要以下任一信息不明确，就应调用 ask_user 向用户提问（可一次问多个问题，分多次调用）：
- **出行天数**：未明确几天（"旅游"但没说几天）→ 问"计划玩几天？"
- **出行日期**：未说明何时出发 → 问"打算什么时候去？"
- **同行人**：独自/情侣/家庭/朋友不清 → 问"几个人一起？有小孩/老人吗？"
- **预算范围**：未提预算 → 问"人均预算大概多少？"
- **交通偏好**：自驾/高铁/飞机未明 → 问"打算怎么去？"
- **兴趣偏好**：户外/人文/美食/购物/拍照未明 → 问"更想去哪类地方？"
- **住宿要求**：需要过夜但没说标准 → 问"住什么档次？民宿/经济型/高端？"
- **节奏偏好**：行程紧凑还是悠闲未明 → 问"喜欢紧凑打卡还是悠闲慢游？"
- **饮食限制**：有无忌口/偏好 → 问"有什么不吃的吗？"
- **特殊需求**：宠物同行/无障碍/夜生活等 → 主动确认
不要自行假设以上信息，宁可多问一句也不要猜错。

## 输出要求
收集完信息后，请输出最终攻略，格式为严格 JSON（不要包含其他文字、不要 markdown 代码块）：
{
  "title": "攻略标题",
  "summary": "一句话总结",
  "reasoning": "Agent 的思考过程说明（综合了哪些信息）",
  "recommendations": [
    {
      "name": "地点名",
      "type": "类型",
      "address": "地址",
      "lat": 纬度,
      "lng": 经度,
      "distance": 距离(米),
      "rating": 评分,
      "cost": 人均花费,
      "matchScore": 匹配度0-100,
      "reason": "推荐理由（结合天气、位置、用户需求）",
      "highlights": ["亮点1", "亮点2"],
      "tips": ["贴士1"],
      "navUrl": "导航链接（可选）",
      "day": 1,
      "timeSlot": "morning"
    }
  ],
  "itinerary": [
    {
      "day": 1,
      "date": "日期（可选）",
      "morning": {"name":"地点","reason":"理由"},
      "afternoon": {"name":"地点","reason":"理由"},
      "evening": {"name":"地点","reason":"理由"}
    }
  ],
  "tickets": [{"label":"标签","url":"链接","note":"说明"}],
  "hotels": [{"label":"标签","url":"链接","note":"说明"}],
  "searchLinks": [{"label":"标签","url":"链接","note":"说明"}],
  "weatherAdvisory": "天气出行建议",
  "overallTips": ["总体建议1", "总体建议2"],
  "planMode": "flat|timeline"
}

## 重要规则
1. recommendations 至少3个，最多12个地点
2. matchScore 要基于实际匹配度，不要都给高分
3. reason 要具体，结合天气和位置说明为什么推荐
4. 如果用户要跨城出行，调用 search_tickets 查车票
5. 如果用户需要过夜，调用 search_hotels 查酒店
6. 如果涉及具体景点信息，调用 web_search 查攻略
7. 综合考虑用户当前位置和目标位置的距离
8. ⚠️ 跨城旅游时，recommendations 必须是目标城市的地点，不要返回当前城市的地点
9. 多日行程（用户提到天数/Day）时，每个 recommendation 必须有 day 字段（1, 2, 3...）和 timeSlot（morning/afternoon/evening）
10. 多日行程时，必须输出 itinerary 数组，按天组织早中晚行程
11. 单日行程或未明确天数时，planMode 为 "flat"；多日行程时 planMode 为 "timeline"
12. 如果任何关键信息不明确（出行天数/日期/同行人/预算/交通/兴趣/住宿/节奏/饮食/特殊需求等），调用 ask_user 向用户提问，不要自行假设`;
}

/**
 * 按规划模板强制规范化 plan（planMode / itinerary / day / timeSlot）
 * 解决"模型不遵照模板排序"的问题：无论模型返回什么，这里都按 context.planTemplate 强制矫正
 * @param {Object} plan - 已解析的攻略
 * @param {Object} context - 上下文 {planTemplate, isMultiDay, dayCount}
 * @returns {Object} 规范化后的 plan
 */
function normalizePlanByTemplate(plan, context) {
  if (!plan) return plan;
  const tpl = context?.planTemplate || 'auto';
  const isMultiDay = context?.isMultiDay === true;
  const dayCount = Math.max(1, Number(context?.dayCount) || 1);
  const recs = Array.isArray(plan.recommendations) ? plan.recommendations : [];

  const SLOTS = ['morning', 'afternoon', 'evening'];

  // ---- flat 模板：强制平铺，清除所有时间线字段 ----
  if (tpl === 'flat') {
    plan.planMode = 'flat';
    delete plan.itinerary;
    for (const r of recs) {
      delete r.day;
      delete r.timeSlot;
    }
    return plan;
  }

  // ---- timeline 模板：单日时间线（上午/下午/晚上） ----
  if (tpl === 'timeline') {
    plan.planMode = 'timeline';
    for (const r of recs) {
      r.day = 1;
      if (!r.timeSlot || !SLOTS.includes(r.timeSlot)) {
        r.timeSlot = SLOTS[Math.min(recs.indexOf(r) % 3, 2)];
      }
    }
    plan.itinerary = buildItinerary(recs, 1);
    return plan;
  }

  // ---- multi-day 模板：多日时间线 ----
  if (tpl === 'multi-day') {
    plan.planMode = 'timeline';
    const days = Math.max(dayCount, 1);
    // 若模型未正确分配 day，则按数量均分到各天
    const hasValidDay = recs.some(r => Number(r.day) >= 1 && Number(r.day) <= days);
    if (!hasValidDay) {
      const perDay = Math.ceil(recs.length / days) || 1;
      recs.forEach((r, i) => {
        r.day = Math.min(Math.floor(i / perDay) + 1, days);
        if (!r.timeSlot || !SLOTS.includes(r.timeSlot)) {
          r.timeSlot = SLOTS[i % 3];
        }
      });
    } else {
      // 已有 day，只补 timeSlot
      recs.forEach((r, i) => {
        r.day = Math.min(Math.max(1, Number(r.day) || 1), days);
        if (!r.timeSlot || !SLOTS.includes(r.timeSlot)) {
          r.timeSlot = SLOTS[i % 3];
        }
      });
    }
    plan.itinerary = buildItinerary(recs, days);
    return plan;
  }

  // ---- auto 模板 ----
  if (isMultiDay) {
    // 自动检测到多日 → 强制时间线
    plan.planMode = 'timeline';
    const days = Math.max(dayCount, 1);
    const hasValidDay = recs.some(r => Number(r.day) >= 1 && Number(r.day) <= days);
    if (!hasValidDay) {
      const perDay = Math.ceil(recs.length / days) || 1;
      recs.forEach((r, i) => {
        r.day = Math.min(Math.floor(i / perDay) + 1, days);
        if (!r.timeSlot || !SLOTS.includes(r.timeSlot)) {
          r.timeSlot = SLOTS[i % 3];
        }
      });
    } else {
      recs.forEach((r, i) => {
        r.day = Math.min(Math.max(1, Number(r.day) || 1), days);
        if (!r.timeSlot || !SLOTS.includes(r.timeSlot)) {
          r.timeSlot = SLOTS[i % 3];
        }
      });
    }
    if (!Array.isArray(plan.itinerary) || plan.itinerary.length === 0) {
      plan.itinerary = buildItinerary(recs, days);
    }
    return plan;
  }

  // auto + 非多日：校验 planMode 合法性
  if (plan.planMode !== 'flat' && plan.planMode !== 'timeline') {
    plan.planMode = 'flat';
  }
  return plan;
}

/**
 * 根据已分配 day/timeSlot 的推荐列表构建 itinerary 数组
 * @param {Array} recs - 带 day/timeSlot 的推荐
 * @param {number} days - 总天数
 * @returns {Array} itinerary
 */
function buildItinerary(recs, days) {
  const SLOTS = ['morning', 'afternoon', 'evening'];
  const itinerary = [];
  for (let d = 1; d <= days; d++) {
    const dayRecs = recs.filter(r => (Number(r.day) || 1) === d);
    const entry = { day: d };
    for (const slot of SLOTS) {
      const r = dayRecs.find(x => x.timeSlot === slot);
      if (r) {
        entry[slot] = { name: r.name, reason: r.reason || '' };
      }
    }
    itinerary.push(entry);
  }
  return itinerary;
}

/**
 * 解析 Agent 返回的攻略 JSON
 */
function parseAgentPlan(rawContent, toolCalls, context) {
  let parsed = null;
  const content = rawContent || '';

  // 尝试直接解析
  try {
    parsed = JSON.parse(content);
  } catch {
    // 尝试从 markdown 代码块提取
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try { parsed = JSON.parse(codeBlockMatch[1].trim()); } catch {}
    }
    // 尝试从文本提取 JSON 对象
    if (!parsed) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {}
      }
    }
  }

  // 如果解析失败，从工具调用结果中降级构建
  if (!parsed) {
    parsed = buildFallbackPlan(toolCalls, context);
  }

  // 合并工具调用中的链接资源
  const tickets = [];
  const hotels = [];
  const searchLinks = [];

  for (const tc of toolCalls) {
    if (tc.name === 'search_tickets' && tc.result?.results) {
      tickets.push(...tc.result.results);
    }
    if (tc.name === 'search_hotels' && tc.result?.results) {
      hotels.push(...tc.result.results);
    }
    if (tc.name === 'web_search' && tc.result?.results) {
      searchLinks.push(...tc.result.results);
    }
  }

  if (tickets.length > 0 && (!parsed.tickets || parsed.tickets.length === 0)) parsed.tickets = tickets;
  if (hotels.length > 0 && (!parsed.hotels || parsed.hotels.length === 0)) parsed.hotels = hotels;
  if (searchLinks.length > 0 && (!parsed.searchLinks || parsed.searchLinks.length === 0)) parsed.searchLinks = searchLinks;

  // 为 recommendations 补充 navUrl
  if (parsed.recommendations) {
    parsed.recommendations = parsed.recommendations.map(r => {
      if (!r.navUrl && r.lat && r.lng) {
        // 从工具调用中找到对应的导航链接
        for (const tc of toolCalls) {
          if (tc.name === 'get_navigation' && tc.result?.lat === r.lat && tc.result?.lng === r.lng) {
            r.navUrl = tc.result.url;
            break;
          }
        }
      }
      return r;
    });
  }

  // ⚠️ 强制按规划模板规范化（解决模型不遵照模板排序的问题）
  parsed = normalizePlanByTemplate(parsed, context);

  return parsed;
}

/**
 * 降级方案：从工具调用结果构建攻略（当 LLM 输出无法解析时）
 */
function buildFallbackPlan(toolCalls, context) {
  const recommendations = [];
  const tickets = [];
  const hotels = [];
  const searchLinks = [];

  for (const tc of toolCalls) {
    if (tc.name === 'search_places' && tc.result?.places) {
      for (const p of tc.result.places) {
        recommendations.push({
          name: p.name,
          type: p.type,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          distance: p.distance,
          rating: p.rating,
          cost: p.cost,
          matchScore: 70,
          reason: `${p.name}，${p.type || '附近推荐地点'}`,
          highlights: [p.type || '推荐地点'],
          tips: []
        });
      }
    }
    if (tc.name === 'search_tickets' && tc.result?.results) tickets.push(...tc.result.results);
    if (tc.name === 'search_hotels' && tc.result?.results) hotels.push(...tc.result.results);
    if (tc.name === 'web_search' && tc.result?.results) searchLinks.push(...tc.result.results);
    if (tc.name === 'get_navigation' && tc.result?.url) {
      // 单独的导航调用，作为搜索链接
      searchLinks.push({ label: tc.result.destination, url: tc.result.url, note: '导航链接' });
    }
  }

  return {
    title: '旅游攻略（Agent 降级模式）',
    summary: '基于工具调用结果生成',
    reasoning: 'LLM 输出解析失败，从工具调用结果降级构建',
    recommendations: recommendations.slice(0, 12),
    tickets,
    hotels,
    searchLinks,
    weatherAdvisory: '',
    overallTips: []
  };
}

/**
 * 解析用户自然语言需求 → 结构化偏好 + 搜索关键词
 * @param {string} userInput - 用户自然语言输入
 * @param {string} location - 用户位置信息
 * @returns {Promise<Object>} {keywords, interests, groupType, budget, duration, transport, reasoning}
 */
export async function parseUserNeeds(userInput, location) {
  const systemPrompt = `你是一个出游推荐助手。用户会描述出游需求，你需要将其解析为结构化数据，用于在地图上搜索真实地点（POI）。

重要：keywords字段是用于地图POI搜索的关键词，必须是具体的地点类型名称（如"公园""博物馆""咖啡馆""湖泊"），而不是抽象概念（如"出片的地方""网红打卡地"）。

请严格返回以下JSON格式（不要包含其他文字）：
{
  "keywords": ["搜索关键词1", "搜索关键词2", "搜索关键词3", "搜索关键词4", "搜索关键词5"],
  "interests": ["兴趣类型"],
  "groupType": "人群类型",
  "budget": {"min": 数字, "max": 数字, "perPerson": true},
  "duration": "半日|一日|两日",
  "transport": ["交通方式"],
  "reasoning": "简短解释为什么这样解析"
}

兴趣类型可选值：nature(亲近自然), culture(人文古迹), food(美食探店), photo(拍照打卡), kids(亲子互动), indoor(室内休闲), sports(运动户外), art(文艺看展)
人群类型可选值：solo(独自出发), couple(两人世界), family(带娃家庭), friends(朋友结伴)
交通方式可选值：walk(步行), metro(地铁/公交), car(自驾), taxi(打车), bike(骑行)
预算单位：元/人

关键词生成规则：
- 必须是地图上能搜到的具体地点类型
- 拍照场景 → 公园、湖泊、观景台、博物馆、艺术区、创意园、植物园、古建筑
- 美食场景 → 餐厅、咖啡馆、小吃街、美食广场、酒吧、甜品店
- 自然场景 → 公园、森林、湖泊、湿地、山峰、花园、植物园
- 文化场景 → 博物馆、古建筑、寺庙、剧院、历史街区
- 亲子场景 → 动物园、游乐场、科技馆、公园、海洋馆
- 运动场景 → 体育场、游泳馆、公园、骑行道、登山步道
- 娱乐场景 → 电影院、KTV、密室逃脱、酒吧、游乐场、商场
- 购物场景 → 商场、步行街、购物中心、市场、商业街

重要：即使用户只说"拍照"，也要包含1-2个餐饮或娱乐类关键词，因为用户出门通常也需要吃饭和休闲。

用户位置：${location}
用户需求：${userInput}

请根据用户描述生成4-5个最相关的地图搜索关键词。`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput }
  ];

  const result = await chat(messages, {
    temperature: 0.3,
    responseFormat: 'json',
    maxTokens: 1000
  });

  try {
    // 尝试直接解析JSON
    let parsed = JSON.parse(result);
    return parsed;
  } catch {
    // 如果直接解析失败，尝试从文本中提取JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('大模型返回格式异常，无法解析');
  }
}

/**
 * 为搜索结果生成个性化推荐理由
 * @param {Object} preferences - 用户偏好
 * @param {Array} pois - POI列表
 * @returns {Promise<Array>} 带推荐理由的POI列表
 */
export async function generateRecommendations(preferences, pois) {
  if (!pois || pois.length === 0) return [];

  // 取前10个POI让大模型排序和生成理由
  const topPois = pois.slice(0, 10);
  const poiSummary = topPois.map((p, i) => ({
    index: i,
    name: p.name,
    type: p.type,
    address: p.address,
    distance: p.distance,
    rating: p.rating,
    cost: p.cost
  }));

  const systemPrompt = `你是一个出游推荐助手。根据用户偏好和搜索到的真实地点，为每个地点生成个性化推荐理由并排序。

评分规则：
- 90-100：非常匹配，地点类型和特色完美契合用户需求
- 75-89：比较匹配，地点有一定相关性
- 60-74：一般匹配，可以顺路去看看
- 40-59：不太匹配，与用户需求关联度低
- 低于40：不推荐

请严格返回以下JSON格式（不要包含其他文字）：
{
  "recommendations": [
    {
      "index": 0,
      "matchScore": 95,
      "reason": "一句话推荐理由（结合用户偏好和地点特色，说明为什么适合）",
      "highlights": ["亮点1", "亮点2"],
      "tips": ["实用贴士1"]
    }
  ]
}

reason: 不超过40字，具体说明这个地点为什么适合用户（不要写废话）
highlights: 1-2个最突出的亮点
tips: 0-1个实用贴士（如交通、时间等）

用户偏好：${JSON.stringify(preferences)}
候选地点：${JSON.stringify(poiSummary)}

请严格按匹配度从高到低排序，不匹配的地点给低分。`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: '请为这些地点生成推荐理由' }
  ];

  try {
    const result = await chat(messages, {
      temperature: 0.5,
      responseFormat: 'json',
      maxTokens: 2000
    });

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      // 尝试从 markdown 代码块中提取 JSON
      const codeBlockMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try { parsed = JSON.parse(codeBlockMatch[1].trim()); } catch {}
      }
      // 尝试从文本中提取 JSON 对象
      if (!parsed) {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch {}
        }
      }
      if (!parsed) {
        throw new Error('解析失败');
      }
    }

    // 将推荐理由合并到POI数据中
    const recommendations = parsed.recommendations || [];
    const result_list = recommendations
      .map(rec => {
        const poi = topPois[rec.index];
        if (!poi) return null;
        return {
          ...poi,
          matchScore: rec.matchScore || 80,
          reason: rec.reason || '',
          highlights: rec.highlights || [],
          tips: rec.tips || [],
          isAIRecommended: true
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.matchScore - a.matchScore);

    return result_list;
  } catch (error) {
    console.warn('AI推荐生成失败，降级到本地规则引擎:', error.message);
    // 降级：使用本地规则引擎生成推荐（比纯距离排序质量更高）
    try {
      const { generateLocalRecommendations } = await import('./localNlp.js');
      const localResults = generateLocalRecommendations(preferences, topPois);
      if (localResults && localResults.length > 0) {
        return localResults;
      }
    } catch (e) {
      console.warn('本地规则引擎也失败，使用原始排序:', e.message);
    }
    // 最终降级：直接返回原始POI列表
    return topPois.map(poi => ({
      ...poi,
      matchScore: 65,
      reason: `${poi.name}，${poi.type || '附近热门地点'}`,
      highlights: [poi.type || '推荐地点'],
      tips: [],
      isAIRecommended: false
    }));
  }
}

/**
 * 测试大模型连接
 * @returns {Promise<Object>} {success, message, model}
 */
export async function testLLMConnection() {
  const settings = getSettings();
  const llmConfig = settings.llm;

  // 没有apiKey也可以测试（通过服务端代理）
  try {
    const result = await chat(
      [{ role: 'user', content: '你好，请回复"连接成功"' }],
      { temperature: 0, maxTokens: 20 }
    );
    return {
      success: true,
      message: result.slice(0, 50),
      model: llmConfig.model || 'gpt-3.5-turbo'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}
