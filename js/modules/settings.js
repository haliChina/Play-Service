// ============================================
// 设置管理 — 零配置开箱即用，API Key 为可选增强
// localStorage 持久化
// 一会去哪儿 · Settings
// ============================================

const SETTINGS_KEY = 'yihui-settings';

// 默认设置（自定义 LLM，遵循 OpenAI 协议；天气默认 wttr.in 免费无需 Key）
const DEFAULT_SETTINGS = {
  llm: {
    provider: 'custom',
    baseUrl: '',   // 自定义，需保留 /v1 前缀（OpenAI 协议）
    apiKey: '',    // 用户自行配置
    model: '',     // 自定义模型名
    visionSupported: false,  // 是否支持视觉理解（开启时把搜到的图片传给模型分析）
    planTemplate: 'auto'     // 规划模板：auto(自动) / flat(平铺) / timeline(时间线) / multi-day(多日)
  },
  mapProvider: 'amap',
  mapApiKey: '',
  // 天气服务：wttr(免费) / amap(高德天气) / qweather(和风天气) / openweather(OpenWeatherMap)
  weatherProvider: 'wttr',
  weatherApiKey: ''  // 高德/和风/OpenWeatherMap 需要，wttr 无需
};

/**
 * 获取设置
 * @returns {Object} 设置对象
 */
export function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 合并默认值，确保字段完整
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        llm: { ...DEFAULT_SETTINGS.llm, ...(parsed.llm || {}) }
      };
    }
  } catch {
    // 解析失败，返回默认值
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * 保存设置
 * @param {Object} settings - 设置对象
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/**
 * 更新部分设置（合并）
 * @param {Object} partial - 部分设置
 */
export function updateSettings(partial) {
  const current = getSettings();
  const updated = {
    ...current,
    ...partial,
    llm: { ...current.llm, ...(partial.llm || {}) }
  };
  saveSettings(updated);
  return updated;
}

/**
 * 检查是否已配置必要的 API Key
 * LLM：有 apiKey 才算已配置（用户需自行填入）
 * @returns {Object} {llm: boolean, map: boolean, weather: boolean, all: boolean}
 */
export function checkConfigured() {
  const settings = getSettings();
  const llmConfigured = !!(settings.llm?.apiKey);
  const mapConfigured = !!(settings.mapApiKey);
  // wttr 无需 Key，其余需要
  const weatherConfigured = settings.weatherProvider === 'wttr' ? true : !!(settings.weatherApiKey);
  return {
    llm: llmConfigured,
    map: mapConfigured,
    weather: weatherConfigured,
    all: llmConfigured && mapConfigured
  };
}

/**
 * 检查是否需要显示配置引导
 * 零配置开箱即用：默认不需要配置，API Key 是可选增强
 * @returns {boolean}
 */
export function needsSetup() {
  return false;
}

/**
 * 检查是否已启用增强模式（配置了任意 API Key）
 * @returns {boolean}
 */
export function isEnhancedMode() {
  return checkConfigured().llm || checkConfigured().map;
}

/**
 * 清除设置
 */
export function clearSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}

/**
 * 获取 LLM 配置
 */
export function getLLMConfig() {
  return getSettings().llm;
}

/**
 * 获取地图配置
 */
export function getMapConfig() {
  const settings = getSettings();
  return {
    provider: settings.mapProvider,
    apiKey: settings.mapApiKey
  };
}

/**
 * 获取天气配置
 */
export function getWeatherConfig() {
  const settings = getSettings();
  return {
    provider: settings.weatherProvider || 'wttr',
    apiKey: settings.weatherApiKey || ''
  };
}
