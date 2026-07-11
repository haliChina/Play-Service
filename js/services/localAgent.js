// ============================================
// 本地 Agent 引擎 — 无 LLM 时的 ToolCall 模拟
// 用规则引擎模拟 Agent 的工具调用流程，实现零配置可用
// 一会去哪儿 · Local Agent Engine
// ============================================

import { parseNeeds, generateLocalRecommendations } from './localNlp.js';
import { executeTool, getToolLabel } from './agentTools.js';

/**
 * 本地 Agent 模拟（无 LLM API 时使用）
 * 根据用户输入和上下文，模拟 Agent 的工具调用决策流程
 *
 * @param {string} userInput - 用户自然语言需求
 * @param {Object} context - 上下文 {currentLocation, targetLocation, weather, city, address, userAddress}
 * @param {Function} onStep - 回调 (step) => void
 * @returns {Promise<Object>} {plan, toolCalls, steps}
 */
export async function runLocalAgent(userInput, context = {}, onStep = null) {
  const steps = [];
  const toolCalls = [];
  const { currentLocation, targetLocation, weather, city, userAddress } = context;

  const report = (step) => {
    steps.push(step);
    if (onStep) onStep(step);
  };

  // ── Step 1: 本地 NLP 解析需求 ──
  report({ type: 'thinking', content: '正在分析你的需求…' });
  await sleep(300);

  const preferences = parseNeeds(userInput, city || '');
  report({
    type: 'thinking',
    content: `识别到：${preferences.reasoning}`
  });
  await sleep(300);

  // ── Step 2: 决定调用哪些工具 ──
  const toolsToCall = decideTools(preferences, userInput, context);
  report({
    type: 'thinking',
    content: `Agent 决定调用 ${toolsToCall.length} 个工具：${toolsToCall.map(t => getToolLabel(t.name)).join('、')}`
  });
  await sleep(400);

  // ── Step 3: 执行工具调用 ──
  let weatherData = weather;
  let placesResult = null;
  let crossCity = false;
  const fromCity = city || '';

  for (const toolCall of toolsToCall) {
    report({
      type: 'tool_call',
      toolName: toolCall.name,
      toolArgs: toolCall.args,
      content: `调用工具：${getToolLabel(toolCall.name)}`
    });
    await sleep(300);

    try {
      const result = await executeTool(toolCall.name, toolCall.args);
      toolCalls.push({ name: toolCall.name, args: toolCall.args, result });
      report({
        type: 'tool_result',
        toolName: toolCall.name,
        result,
        content: result.summary || `${getToolLabel(toolCall.name)} 完成`
      });

      // 缓存关键结果
      if (toolCall.name === 'get_weather' && !weatherData) {
        weatherData = result;
      }
      if (toolCall.name === 'search_places') {
        placesResult = result;
      }
      if (toolCall.name === 'search_tickets') {
        crossCity = true;
      }
    } catch (err) {
      report({
        type: 'tool_result',
        toolName: toolCall.name,
        error: err.message,
        content: `${getToolLabel(toolCall.name)} 失败：${err.message}`
      });
      toolCalls.push({ name: toolCall.name, args: toolCall.args, error: err.message });
    }
    await sleep(200);
  }

  // ── Step 4: 综合信息生成攻略 ──
  report({ type: 'thinking', content: '正在综合工具返回结果，生成个性化攻略…' });
  await sleep(400);

  const plan = buildLocalPlan(preferences, toolCalls, context, placesResult, weatherData);

  report({
    type: 'final',
    content: `攻略生成完成：${plan.title}，共 ${plan.recommendations?.length || 0} 个推荐地点`
  });

  return { plan, toolCalls, steps, rawResponse: null, isLocal: true };
}

/**
 * 决定需要调用哪些工具
 * 关键：跨城旅游时，搜索目标城市的 POI 而非当前城市
 */
function decideTools(preferences, userInput, context) {
  const tools = [];
  const { city, userAddress, currentLocation, weather, targetLocation, isCrossCity, searchCity } = context;
  const text = userInput;

  // 跨城旅游时，搜索的城市应该是目标城市
  const poiSearchCity = (isCrossCity && targetLocation) ? targetLocation : (city || '');
  const weatherCity = (isCrossCity && targetLocation) ? targetLocation : (city || '北京');

  // 1. 天气查询（如果没有缓存的天气数据，或跨城需要查目标城市天气）
  if (!weather || isCrossCity) {
    tools.push({
      name: 'get_weather',
      args: { city: weatherCity }
    });
  }

  // 2. POI 搜索（核心）— 跨城时搜索目标城市
  for (const kw of preferences.keywords.slice(0, 3)) {
    tools.push({
      name: 'search_places',
      args: { keywords: kw, city: poiSearchCity }
    });
  }

  // 3. 车票查询（跨城出行）
  if (isCrossCity && targetLocation) {
    tools.push({
      name: 'search_tickets',
      args: { from_city: city || '', to_city: targetLocation }
    });
  } else {
    // 也匹配用户明说"从A到B"的情况
    const cityMatch = text.match(/从([\u4e00-\u9fa5]{2,6}?)[去到]([\u4e00-\u9fa5]{2,6}?)(?:玩|旅游|出差|看看)/);
    if (cityMatch) {
      tools.push({
        name: 'search_tickets',
        args: { from_city: cityMatch[1], to_city: cityMatch[2] }
      });
    }
  }

  // 4. 酒店查询（过夜）
  if (preferences.duration === 'two-day' || /住|酒店|民宿|过夜|住宿/.test(text)) {
    tools.push({
      name: 'search_hotels',
      args: { city: poiSearchCity, keyword: preferences.interests.includes('nature') ? '景区附近' : '市中心' }
    });
  }

  // 5. 网页搜索（特定景点 或 跨城旅游查攻略）
  const spotMatch = text.match(/([\u4e00-\u9fa5]{2,8}(?:公园|博物馆|景区|古镇|景点|寺|庙|山|湖))/);
  if (spotMatch) {
    tools.push({
      name: 'web_search',
      args: { query: `${spotMatch[1]} 攻略 门票 开放时间` }
    });
  } else if (isCrossCity && targetLocation) {
    // 跨城旅游，查目标城市的整体攻略
    tools.push({
      name: 'web_search',
      args: { query: `${targetLocation} 旅游攻略 必去景点 美食推荐` }
    });
  }

  return tools;
}

/**
 * 综合工具调用结果构建本地攻略
 */
function buildLocalPlan(preferences, toolCalls, context, placesResult, weatherData) {
  const { city, targetLocation, isCrossCity } = context;
  // 跨城旅游时，攻略标题用目标城市
  const planCity = (isCrossCity && targetLocation) ? targetLocation : city;
  const recommendations = [];
  const tickets = [];
  const hotels = [];
  const searchLinks = [];

  // 收集工具结果
  let allPlaces = [];
  for (const tc of toolCalls) {
    if (tc.name === 'search_places' && tc.result?.places) {
      allPlaces.push(...tc.result.places);
    }
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

  // 去重（按名称）
  const seen = new Set();
  allPlaces = allPlaces.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });

  // 用本地规则引擎生成推荐
  const prefsWithWeather = { ...preferences, weatherCondition: weatherData?.condition || 'cloudy' };
  const ranked = generateLocalRecommendations(prefsWithWeather, allPlaces);

  recommendations.push(...ranked.slice(0, 12));

  // 天气建议
  let weatherAdvisory = '';
  if (weatherData) {
    const badWeather = ['rainy', 'snowy', 'overcast'].includes(weatherData.condition);
    if (badWeather) {
      weatherAdvisory = `${weatherData.city}当前${weatherData.weatherDesc}，${weatherData.temp}°C，建议优先选择室内活动（博物馆、商场、咖啡馆），户外活动请携带雨具。`;
    } else if (weatherData.condition === 'sunny' || weatherData.condition === 'cloudy-to-sunny') {
      weatherAdvisory = `${weatherData.city}当前${weatherData.weatherDesc}，${weatherData.temp}°C，天气不错，非常适合户外活动。注意防晒，紫外线指数${weatherData.uvIndex}。`;
    } else {
      weatherAdvisory = `${weatherData.city}当前${weatherData.weatherDesc}，${weatherData.temp}°C，体感${weatherData.feelsLike}°C，适合一般出行。`;
    }
  }

  // 总体建议
  const overallTips = [];
  if (recommendations.length > 0) {
    const avgDistance = recommendations.reduce((s, r) => s + (r.distance || 0), 0) / recommendations.length;
    if (avgDistance > 5000) {
      overallTips.push('推荐地点平均距离较远，建议规划合理路线或选择公共交通');
    } else if (avgDistance < 2000) {
      overallTips.push('推荐地点大多步行可达，适合悠闲漫步');
    }
  }
  if (preferences.budget?.max < 100) {
    overallTips.push('预算较紧，推荐选择免费公园和街头小吃');
  }
  if (preferences.groupType === 'family') {
    overallTips.push('带娃出行建议避开高峰时段，准备好零食和水');
  }

  return {
    title: `${planCity || '周边'}${preferences.interests.slice(0, 2).map(i => getInterestLabel(i)).join('·')}攻略${isCrossCity ? '·跨城' : ''}`,
    summary: preferences.reasoning,
    reasoning: `Agent 调用了 ${toolCalls.length} 个工具（${toolCalls.map(t => getToolLabel(t.name)).join('、')}），综合天气、地点、距离、评分等信息生成`,
    recommendations,
    tickets,
    hotels,
    searchLinks,
    weatherAdvisory,
    overallTips,
    isLocalAgent: true
  };
}

function getInterestLabel(interest) {
  const labels = {
    nature: '亲近自然', culture: '人文古迹', food: '美食探店', photo: '拍照打卡',
    kids: '亲子互动', indoor: '室内休闲', sports: '运动户外', art: '文艺看展'
  };
  return labels[interest] || interest;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
