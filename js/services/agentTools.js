// ============================================
// Agent 工具集 — ToolCall 引擎
// 浏览器端实现的旅游 Agent 工具，支持 LLM ToolCall 调用
// 一会去哪儿 · Agent Tools
// ============================================

import { fetchWeather, fetchWeatherByCoords } from './weatherService.js';
import { geocode, reverseGeocode, searchPOIs, searchNearby, getNavigateUrl, enrichPOIsWithImages } from './mapService.js';
import { getSettings } from '../modules/settings.js';
import { askUser } from './askUser.js';

// ── 真实网页搜索（浏览器端，CORS 友好的 Wikimedia API） ──
// Wikivoyage（旅游导向）+ Wikipedia（通用知识）双源，origin=* 允许跨域
const WIKI_SEARCH_TIMEOUT = 6000;

/**
 * 调用 MediaWiki Action API 搜索条目
 * @param {string} wiki - wiki 域名前缀，如 'zh.wikivoyage' / 'zh.wikipedia'
 * @param {string} query - 搜索词
 * @param {number} limit - 返回条数
 * @returns {Promise<Array>} [{title, snippet, pageid}]
 */
async function wikiSearch(wiki, query, limit = 5) {
  const url = `https://${wiki}.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&srprop=snippet`;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), WIKI_SEARCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.query?.search || []).map(s => ({
      title: s.title,
      snippet: (s.snippet || '').replace(/<[^>]+>/g, ''),  // 去除 HTML 标签
      pageid: s.pageid
    }));
  } catch {
    clearTimeout(tid);
    return [];
  }
}

/**
 * 获取条目的 intro 摘要文本（纯文本）
 * @param {string} wiki - wiki 域名前缀
 * @param {string} title - 条目标题
 * @returns {Promise<string|null>}
 */
async function wikiExtract(wiki, title) {
  const url = `https://${wiki}.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&exsentences=6&titles=${encodeURIComponent(title)}&redirects=1`;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), WIKI_SEARCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages || {};
    const first = Object.values(pages)[0];
    if (!first || first.missing !== undefined) return null;
    return first.extract || null;
  } catch {
    clearTimeout(tid);
    return null;
  }
}

/**
 * 真实网页搜索：Wikivoyage（旅游）优先，Wikipedia 兜底
 * 返回真实摘要文本供模型分析
 * @param {string} query - 搜索词
 * @returns {Promise<Object>} {found, source, title, extract, url, thumbnail}
 */
async function performRealWebSearch(query) {
  // 1. 先搜 Wikivoyage（旅游攻略最相关）
  let wikiResults = await wikiSearch('zh.wikivoyage', query, 3);
  let source = 'Wikivoyage';
  let wiki = 'zh.wikivoyage';
  if (wikiResults.length === 0) {
    // 2. 兜底搜 Wikipedia
    wikiResults = await wikiSearch('zh.wikipedia', query, 3);
    source = 'Wikipedia';
    wiki = 'zh.wikipedia';
  }
  if (wikiResults.length === 0) {
    return { found: false };
  }

  const top = wikiResults[0];
  const extract = await wikiExtract(wiki, top.title);
  const pageUrl = `https://${wiki}.org/wiki/${encodeURIComponent(top.title.replace(/ /g, '_'))}`;

  return {
    found: true,
    source,
    title: top.title,
    snippet: top.snippet,
    extract: extract || top.snippet || '',
    url: pageUrl
  };
}

// ── 工具注册表 ──
// 每个工具包含：name, description, parameters (JSON Schema), execute
const TOOL_REGISTRY = {
  // 1. 查询天气
  get_weather: {
    name: 'get_weather',
    description: '查询指定城市或坐标的实时天气。用于判断户外/室内活动、穿搭建议、是否适合出行。',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市名（中文，如"北京""上海"）' },
        lat: { type: 'number', description: '纬度（可选，优先于city）' },
        lng: { type: 'number', description: '经度（可选，优先于city）' }
      }
    },
    execute: async (args) => {
      const { city, lat, lng } = args;
      let weather;
      if (lat != null && lng != null) {
        weather = await fetchWeatherByCoords(lat, lng);
      } else if (city) {
        weather = await fetchWeather(city);
      } else {
        throw new Error('需要提供 city 或 lat/lng');
      }
      return {
        city: weather.city,
        condition: weather.condition,
        temp: weather.temp,
        feelsLike: weather.feelsLike,
        weatherDesc: weather.weatherDesc,
        humidity: weather.humidity,
        windLevel: weather.windLevel,
        uvIndex: weather.uvIndex,
        maxTemp: weather.maxTemp,
        minTemp: weather.minTemp,
        isRealTime: weather.isRealTime,
        source: weather.source,
        summary: `${weather.city}：${weather.weatherDesc}，${weather.temp}°C（体感${weather.feelsLike}°C），湿度${weather.humidity}%，风力${weather.windLevel}级`
      };
    }
  },

  // 2. 搜索地点 POI
  search_places: {
    name: 'search_places',
    description: '在地图上搜索真实地点（POI）。用于查找公园、餐厅、博物馆、咖啡馆、景点等具体地点。返回名称、地址、坐标、距离、评分等。',
    parameters: {
      type: 'object',
      properties: {
        keywords: { type: 'string', description: '搜索关键词（如"公园""咖啡馆""博物馆"）' },
        city: { type: 'string', description: '城市名（可选，默认用户当前城市）。⚠️ 跨城旅游时必须填目标城市名' },
        lat: { type: 'number', description: '中心点纬度（可选，周边搜索）' },
        lng: { type: 'number', description: '中心点经度（可选，周边搜索）' },
        radius: { type: 'number', description: '搜索半径（米，可选，默认8000）' }
      },
      required: ['keywords']
    },
    execute: async (args) => {
      const { keywords, city = '', lat, lng, radius = 8000 } = args;
      if (!keywords || typeof keywords !== 'string') {
        throw new Error('keywords 参数不能为空');
      }
      let pois = [];
      try {
        if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
          pois = await searchNearby(lat, lng, keywords, [], radius);
        } else {
          pois = await searchPOIs(keywords, city, []);
        }
      } catch (e) {
        console.warn(`[search_places] 搜索失败，尝试降级:`, e.message);
        // 降级：如果周边搜索失败，尝试按城市搜索
        if (lat != null && lng != null && city) {
          try {
            pois = await searchPOIs(keywords, city, []);
          } catch (e2) {
            console.warn(`[search_places] 降级搜索也失败:`, e2.message);
          }
        }
      }

      // 视觉理解模式：为前几个 POI 获取真实图片，供模型"看图"分析
      const settings = getSettings();
      const visionEnabled = settings.llm?.visionSupported === true;
      if (visionEnabled && pois.length > 0) {
        try {
          // 只为前 6 个获取图片，控制 token 和请求量
          await enrichPOIsWithImages(pois, 6);
        } catch (e) {
          console.warn(`[search_places] 图片获取失败（不影响搜索）:`, e.message);
        }
      }

      // 精简返回，避免 token 过多
      const top = pois.slice(0, 15);
      const simplified = top.map(p => {
        const item = {
          name: p.name,
          type: p.type,
          address: p.address,
          distance: p.distance,
          rating: p.rating,
          cost: p.cost,
          lat: p.lat,
          lng: p.lng
        };
        // 视觉理解开启且有图片时，附上图片URL
        if (visionEnabled && p.photos && p.photos.length > 0) {
          item.photo = p.photos[0];
        }
        return item;
      });

      // 收集图片列表（供 Agent 主循环以 vision 格式发给模型）
      const images = visionEnabled
        ? top.filter(p => p.photos && p.photos.length > 0)
            .slice(0, 6)
            .map(p => ({ name: p.name, url: p.photos[0] }))
        : [];

      return {
        count: pois.length,
        city: city || '当前位置',
        keywords,
        places: simplified,
        images,
        visionEnabled,
        summary: pois.length > 0
          ? `在${city || '当前位置'}搜索"${keywords}"找到 ${pois.length} 个地点${visionEnabled && images.length > 0 ? `（已附 ${images.length} 张实景图片供分析）` : ''}`
          : `在${city || '当前位置'}未找到"${keywords}"相关地点`
      };
    }
  },

  // 3. 查询火车票/机票（聚合搜索链接生成）
  search_tickets: {
    name: 'search_tickets',
    description: '查询火车票和机票。生成携程/去哪儿/12306的搜索链接，用户可点击跳转查看实时价格和班次。',
    parameters: {
      type: 'object',
      properties: {
        from_city: { type: 'string', description: '出发城市' },
        to_city: { type: 'string', description: '到达城市' },
        date: { type: 'string', description: '出发日期（YYYY-MM-DD，可选）' },
        type: { type: 'string', enum: ['train', 'flight', 'all'], description: '交通类型（默认all）' }
      },
      required: ['from_city', 'to_city']
    },
    execute: async (args) => {
      const { from_city, to_city, date = '', type = 'all' } = args;
      const dateParam = date || new Date().toISOString().slice(0, 10);
      const results = [];

      if (type === 'train' || type === 'all') {
        results.push({
          provider: '12306',
          label: `${from_city} → ${to_city} 火车票`,
          url: `https://www.12306.cn/index/?oticket=${encodeURIComponent(from_city)}-${encodeURIComponent(to_city)}-${dateParam}`,
          note: '官方铁路售票，可查余票和时刻表'
        });
        results.push({
          provider: '携程火车票',
          label: `${from_city} → ${to_city} 火车票（携程）`,
          url: `https://trains.ctrip.com/webapp/train/list?ticketType=0&dStation=${encodeURIComponent(from_city)}&aStation=${encodeURIComponent(to_city)}&dDate=${dateParam}`,
          note: '可对比价格，支持抢票'
        });
      }

      if (type === 'flight' || type === 'all') {
        results.push({
          provider: '携程机票',
          label: `${from_city} → ${to_city} 机票`,
          url: `https://flights.ctrip.com/online/list/oneway-${encodeURIComponent(from_city)}-${encodeURIComponent(to_city)}?depdate=${dateParam}`,
          note: '实时机票价格对比'
        });
        results.push({
          provider: '去哪儿机票',
          label: `${from_city} → ${to_city} 机票（去哪儿）`,
          url: `https://flight.qunar.com/site/oneway_list.htm?searchDepartureAirport=${encodeURIComponent(from_city)}&searchArrivalAirport=${encodeURIComponent(to_city)}&searchDepartureTime=${dateParam}`,
          note: '特价机票聚合搜索'
        });
      }

      return {
        from: from_city,
        to: to_city,
        date: dateParam,
        type,
        results,
        summary: `已为 ${from_city}→${to_city}（${dateParam}）生成${type === 'all' ? '火车票和机票' : type === 'train' ? '火车票' : '机票'}搜索链接，共${results.length}个渠道`
      };
    }
  },

  // 4. 查询酒店
  search_hotels: {
    name: 'search_hotels',
    description: '查询酒店住宿。生成携程/美团/Booking的搜索链接，用户可点击跳转查看实时房价和预订。',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市名' },
        checkin: { type: 'string', description: '入住日期（YYYY-MM-DD，可选）' },
        checkout: { type: 'string', description: '退房日期（YYYY-MM-DD，可选）' },
        keyword: { type: 'string', description: '关键词（如"西湖附近""经济型""民宿"）' }
      },
      required: ['city']
    },
    execute: async (args) => {
      const { city, checkin = '', checkout = '', keyword = '' } = args;
      const today = new Date();
      const ci = checkin || today.toISOString().slice(0, 10);
      const tomorrow = new Date(today.getTime() + 86400000);
      const co = checkout || tomorrow.toISOString().slice(0, 10);
      const kwParam = keyword ? encodeURIComponent(keyword) : '';

      const results = [
        {
          provider: '携程酒店',
          label: `${city}酒店${keyword ? `·${keyword}` : ''}`,
          url: `https://hotels.ctrip.com/hotels/list?countryId=1&city=${encodeURIComponent(city)}&checkin=${ci}&checkout=${co}${kwParam ? `&keyword=${kwParam}` : ''}`,
          note: '国内酒店全，价格透明'
        },
        {
          provider: '美团酒店',
          label: `${city}酒店（美团）`,
          url: `https://hotel.meituan.com/search/?cityName=${encodeURIComponent(city)}&checkIn=${ci}&checkOut=${co}${kwParam ? `&q=${kwParam}` : ''}`,
          note: '经济型酒店和民宿多'
        },
        {
          provider: 'Booking',
          label: `${city} Hotels (Booking.com)`,
          url: `https://www.booking.com/searchresults.zh-cn.html?ss=${encodeURIComponent(city)}&checkin=${ci}&checkout=${co}`,
          note: '国际酒店，适合海外出行'
        }
      ];

      return {
        city,
        checkin: ci,
        checkout: co,
        keyword,
        results,
        summary: `已为 ${city}（${ci}至${co}）生成${results.length}个酒店搜索渠道${keyword ? `，关键词：${keyword}` : ''}`
      };
    }
  },

  // 5. 生成导航链接
  get_navigation: {
    name: 'get_navigation',
    description: '生成到指定地点的导航链接（高德/百度地图）。用户可点击跳转开始导航。',
    parameters: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: '目的地纬度' },
        lng: { type: 'number', description: '目的地经度' },
        name: { type: 'string', description: '目的地名称' },
        from_lat: { type: 'number', description: '出发地纬度（可选）' },
        from_lng: { type: 'number', description: '出发地经度（可选）' }
      },
      required: ['lat', 'lng', 'name']
    },
    execute: async (args) => {
      const { lat, lng, name, from_lat, from_lng } = args;
      const settings = getSettings();
      const provider = settings.mapProvider || 'amap';
      const url = getNavigateUrl(lat, lng, name, provider);
      return {
        destination: name,
        lat, lng,
        provider: provider === 'amap' ? '高德地图' : '百度地图',
        url,
        summary: `已生成到 ${name} 的${provider === 'amap' ? '高德' : '百度'}地图导航链接`
      };
    }
  },

  // 6. 网页搜索（真实搜索 + 多渠道链接生成 + 异常兜底）
  web_search: {
    name: 'web_search',
    description: '真实网页搜索：先调用 Wikivoyage/Wikipedia API 获取景点攻略摘要（开放时间、特色、历史等），再生成必应/百度/小红书/马蜂窝等搜索链接。用于查询景点攻略、门票价格、开放时间、最新资讯等。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词（如"布达拉宫 门票""拉萨旅游攻略"）' }
      },
      required: ['query']
    },
    execute: async (args) => {
      const rawQuery = args?.query;
      // 参数校验
      if (!rawQuery || typeof rawQuery !== 'string' || rawQuery.trim().length === 0) {
        return {
          query: '',
          results: [],
          summary: '搜索关键词为空，未生成搜索链接'
        };
      }
      const query = rawQuery.trim().slice(0, 100); // 限制长度防止 URL 过长
      let encoded;
      try {
        encoded = encodeURIComponent(query);
      } catch (e) {
        // 兜底：移除特殊字符
        encoded = encodeURIComponent(query.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ''));
      }

      // —— 真实搜索：Wikivoyage（旅游）→ Wikipedia 兜底 ——
      let realResult = null;
      try {
        realResult = await performRealWebSearch(query);
      } catch (e) {
        console.warn(`[web_search] 真实搜索失败，降级到链接生成:`, e.message);
      }

      // —— 多渠道搜索链接生成 ——
      const results = [];
      const providers = [
        { provider: '必应', label: `搜索：${query}`, url: `https://cn.bing.com/search?q=${encoded}`, note: '综合搜索' },
        { provider: '百度', label: `搜索：${query}（百度）`, url: `https://www.baidu.com/s?wd=${encoded}`, note: '中文内容丰富' },
        { provider: '小红书', label: `搜索：${query}（小红书）`, url: `https://www.xiaohongshu.com/search_result?keyword=${encoded}`, note: '真实用户攻略和打卡笔记' },
        { provider: '马蜂窝', label: `搜索：${query}（马蜂窝）`, url: `https://www.mafengwo.cn/search/q.php?q=${encoded}`, note: '旅游攻略和游记' },
        { provider: '知乎', label: `搜索：${query}（知乎）`, url: `https://www.zhihu.com/search?type=content&q=${encoded}`, note: '深度问答和经验分享' },
        { provider: '哔哩哔哩', label: `搜索：${query}（B站）`, url: `https://search.bilibili.com/all?keyword=${encoded}`, note: '视频攻略和 vlog' },
        { provider: '抖音', label: `搜索：${query}（抖音）`, url: `https://www.douyin.com/search/${encoded}`, note: '短视频打卡' },
        { provider: '大众点评', label: `搜索：${query}（大众点评）`, url: `https://www.dianping.com/search/keyword/1/0_${encoded}`, note: '餐厅和景点评价' }
      ];

      // 真实搜索命中的条目作为第一条结果（含摘要正文）
      if (realResult && realResult.found) {
        results.push({
          provider: realResult.source,
          label: `${realResult.title}（${realResult.source}）`,
          url: realResult.url,
          note: '真实百科摘要',
          extract: realResult.extract,
          isRealContent: true
        });
      }

      for (const p of providers) {
        try {
          if (p.url && p.url.startsWith('http')) {
            results.push(p);
          }
        } catch (e) {
          console.warn(`[web_search] 跳过无效渠道 ${p.provider}:`, e.message);
        }
      }

      if (results.length === 0) {
        // 终极兜底：至少返回必应
        results.push({
          provider: '必应',
          label: `搜索：${query}`,
          url: `https://cn.bing.com/search?q=${encoded}`,
          note: '综合搜索（兜底）'
        });
      }

      // 构建给模型参考的摘要正文
      let contentSummary = '';
      if (realResult && realResult.found && realResult.extract) {
        contentSummary = `【${realResult.source}·${realResult.title}】${realResult.extract}`;
      }

      const summaryText = realResult && realResult.found
        ? `已真实搜索"${query}"，来源 ${realResult.source}（${realResult.title}），并生成 ${results.length - 1} 个搜索渠道`
        : `已生成"${query}"的 ${results.length} 个搜索渠道`;

      return {
        query,
        results,
        count: results.length,
        content: contentSummary,
        realSearch: realResult && realResult.found ? {
          source: realResult.source,
          title: realResult.title,
          url: realResult.url,
          extract: realResult.extract
        } : null,
        summary: summaryText
      };
    }
  },

  // 7. 地理编码（地址→坐标）
  geocode: {
    name: 'geocode',
    description: '将地址文本转换为经纬度坐标。用于确定用户提到的具体位置。',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '地址文本' },
        city: { type: 'string', description: '所在城市（可选）' }
      },
      required: ['address']
    },
    execute: async (args) => {
      const { address, city = '' } = args;
      const result = await geocode(address, city);
      return {
        address,
        formattedAddress: result.formattedAddress,
        lat: result.lat,
        lng: result.lng,
        province: result.province,
        city: result.city,
        district: result.district,
        summary: `${address} → ${result.formattedAddress} (${result.lat.toFixed(4)}, ${result.lng.toFixed(4)})`
      };
    }
  },

  // 8. 逆地理编码（坐标→地址）
  reverse_geocode: {
    name: 'reverse_geocode',
    description: '将经纬度坐标转换为地址信息。用于定位用户当前位置。',
    parameters: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: '纬度' },
        lng: { type: 'number', description: '经度' }
      },
      required: ['lat', 'lng']
    },
    execute: async (args) => {
      const { lat, lng } = args;
      const result = await reverseGeocode(lat, lng);
      return {
        lat, lng,
        formattedAddress: result.formattedAddress,
        province: result.province,
        city: result.city,
        district: result.district,
        summary: `(${lat.toFixed(4)}, ${lng.toFixed(4)}) → ${result.formattedAddress}`
      };
    }
  },

  // 9. 向用户提问（信息缺失时调用）
  ask_user: {
    name: 'ask_user',
    description: '当缺少必要信息时向用户提问。支持单选、多选、文字回答三种模式。例如：不确定出行天数、预算范围、出行方式偏好时调用。超时60秒自动取消。',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: '要问用户的问题' },
        mode: { type: 'string', enum: ['single', 'multi', 'text'], description: '提问模式：single=单选，multi=多选，text=文字回答' },
        options: { type: 'array', items: { type: 'string' }, description: '选项列表（single/multi 模式必填）' },
        placeholder: { type: 'string', description: '文字输入占位符（text 模式可选）' }
      },
      required: ['question', 'mode']
    },
    execute: async (args) => {
      const { question, mode = 'text', options = [], placeholder = '请输入…' } = args;
      const result = await askUser({ question, mode, options, placeholder, timeout: 60000 });

      if (result.timedOut) {
        return { answered: false, reason: '用户未在60秒内回答（超时自动取消）', answer: null };
      }
      if (result.cancelled) {
        return { answered: false, reason: '用户取消了回答', answer: null };
      }
      return {
        answered: true,
        answer: result.answer,
        summary: `用户回答：${Array.isArray(result.answer) ? result.answer.join('、') : result.answer}`
      };
    }
  }
};

/**
 * 获取所有工具的 OpenAI Function 定义（用于 LLM ToolCall）
 */
export function getToolDefinitions() {
  return Object.values(TOOL_REGISTRY).map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

/**
 * 执行指定工具
 * @param {string} toolName - 工具名
 * @param {Object} args - 工具参数
 * @returns {Promise<Object>} 工具执行结果
 */
export async function executeTool(toolName, args = {}) {
  const tool = TOOL_REGISTRY[toolName];
  if (!tool) {
    throw new Error(`未知工具: ${toolName}`);
  }
  console.log(`[ToolCall] 执行 ${toolName}`, args);
  const result = await tool.execute(args);
  console.log(`[ToolCall] ${toolName} 完成`, result?.summary || '');
  return result;
}

/**
 * 获取工具的中文标签（用于 UI 展示）
 */
export function getToolLabel(toolName) {
  const labels = {
    get_weather: '查询天气',
    search_places: '搜索地点',
    search_tickets: '查询车票',
    search_hotels: '查询酒店',
    get_navigation: '生成导航',
    web_search: '网页搜索',
    geocode: '地址定位',
    reverse_geocode: '位置解析',
    ask_user: '询问用户'
  };
  return labels[toolName] || toolName;
}

/**
 * 获取工具图标名（用于 UI 展示）
 */
export function getToolIcon(toolName) {
  const icons = {
    get_weather: 'sun',
    search_places: 'map-pin',
    search_tickets: 'ticket',
    search_hotels: 'bed',
    get_navigation: 'navigation',
    web_search: 'search',
    geocode: 'map-pin',
    reverse_geocode: 'location',
    ask_user: 'info'
  };
  return icons[toolName] || 'tool';
}
